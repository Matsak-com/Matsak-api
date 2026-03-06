import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

import { ERRORS } from '../common/errors';
import { PaymentRepository } from './payment.repository';
import { Payment, PaymentStatus, PaymentMethod } from './payment.schema';
import { MvolaApiService } from './Mvola/mvola-api.service';
import { CartRepository } from '../cart-item/cart.repository';
import { ProductService } from '../product/product.service';
import { InvoiceService } from '../invoice/invoice.service';
import { CartService } from '../cart-item/cart.service';
import { InventoryService } from '../inventory/inventory.service';

export interface InitPaymentInput {
  cartId: string;
  userId?: string;
  customerPhone: string;
}

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);
  private readonly callbackBaseUrl: string;

  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly cartRepo: CartRepository,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
    private readonly mvolaApiService: MvolaApiService,
    private readonly configService: ConfigService,
    private readonly invoiceService: InvoiceService,
    private readonly inventoryService: InventoryService,
  ) {
    this.callbackBaseUrl = this.configService.get<string>(
      'APP_CALLBACK_BASE_URL',
      'http://localhost:3000',
    );
  }

  onModuleInit() {
    this.logger.log('PaymentService initialisé');
  }

  // ── 1. Initier un paiement Mvola ───────────────────────────────────
  async initiate(input: InitPaymentInput): Promise<Payment> {
    const { cartId, userId, customerPhone } = input;
    let paymentId: string | null = null;

    try {
      const cart = await this.cartRepo.findById({
        id: new Types.ObjectId(cartId),
        options: { populate: [{ path: 'items.product' }] },
      });

      if (!cart || cart.deleted_at) {
        throw new NotFoundException(ERRORS.CART_NOT_FOUND);
      }

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException(ERRORS.CART_EMPTY);
      }

      let totalAmount = 0;
      for (const item of cart.items) {
        const product = item.product as any;
        const pricing = this.productService.calculatePrice(product, item.quantity);
        totalAmount += pricing.totalPrice;
      }

      if (totalAmount <= 0) {
        throw new BadRequestException(ERRORS.INVALID_AMOUNT);
      }

      const existingActive = await this.paymentRepo.findOne({
        filter: {
          cartId: new Types.ObjectId(cartId),
          status: { $in: [PaymentStatus.PENDING, PaymentStatus.WAITING] },
        },
      });

      if (existingActive) {
        throw new BadRequestException(ERRORS.PAYMENT_ALREADY_IN_PROGRESS);
      }

      const correlationId = uuidv4();
      const transactionReference = uuidv4();

      const payment = await this.paymentRepo.create({
        doc: {
          cartId: new Types.ObjectId(cartId),
          userId: userId ? new Types.ObjectId(userId) : undefined,
          method: PaymentMethod.MVOLA,
          amount: totalAmount,
          currency: 'Ar',
          status: PaymentStatus.PENDING,
          correlationId,
          transactionReference,
          customerPhone,
        },
      });

      paymentId = (payment as any)._id.toString();

      const mvolaResponse = await this.mvolaApiService.initMerchantPay({
        amount: totalAmount,
        customerPhone,
        transactionReference,
        correlationId,
        callbackUrl: `${this.callbackBaseUrl}/payments/callback`,
        descriptionText: `Commande - Panier ${cartId}`,
      });

      await this.paymentRepo.update({
        id: paymentId,
        update: {
          serverCorrelationId: mvolaResponse.serverCorrelationId,
          status: PaymentStatus.WAITING,
          mvolaResponse,
        },
      });

      return this.paymentRepo.findById({ id: paymentId });
    } catch (error) {
      if (paymentId) {
        try {
          await this.paymentRepo.update({
            id: paymentId,
            update: { status: PaymentStatus.FAILED, failureReason: error.message },
          });
        } catch (cleanupError) {
          this.logger.error(`Failed to rollback payment ${paymentId}`, cleanupError);
        }
      }

      if ((error as any).code === 11000) {
        throw new BadRequestException(ERRORS.PAYMENT_DUPLICATE);
      }

      this.logger.error('Error initiating payment', error);
      throw error;
    }
  }

  // ── 2. Callback Mvola ───────────────────────────────────────────────
  async handleCallback(callbackData: Record<string, any>): Promise<void> {
    this.logger.log('Callback Mvola reçu', JSON.stringify(callbackData));

    const { serverCorrelationId, status } = callbackData;

    if (!serverCorrelationId) {
      this.logger.warn('Callback sans serverCorrelationId — ignoré');
      return;
    }

    const payment = await this.paymentRepo.findOne({
      filter: { serverCorrelationId },
    });

    if (!payment) {
      this.logger.warn(`Callback pour serverCorrelationId inconnu: ${serverCorrelationId}`);
      return;
    }

    const newStatus =
      status === 'COMPLETED' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

    await this.paymentRepo.update({
      id: payment._id.toString(),
      update: {
        status: newStatus,
        mvolaResponse: callbackData,
        ...(newStatus === PaymentStatus.FAILED && { failureReason: status }),
      },
    });

    if (newStatus === PaymentStatus.SUCCESS) {
      await this.handlePaymentSuccess(
        payment._id.toString(),
        payment.cartId,
        payment.userId?.toString(),
      );
    }
  }

  // ── 3. Polling ──────────────────────────────────────────────────────
  async pollStatus(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) {
      throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);
    }

    if (
      [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.EXPIRED].includes(
        payment.status,
      )
    ) {
      return payment;
    }

    if (!payment.serverCorrelationId || !payment.correlationId) {
      throw new BadRequestException('Données de transaction incomplètes');
    }

    const mvolaStatus = await this.mvolaApiService.getTransactionStatus(
      payment.serverCorrelationId,
      payment.correlationId,
    );

    let newStatus = payment.status;

    if (mvolaStatus.status === 'COMPLETED') {
      newStatus = PaymentStatus.SUCCESS;
    } else if (['FAILED', 'CANCELLED'].includes(mvolaStatus.status)) {
      newStatus = PaymentStatus.FAILED;
    }

    if (newStatus !== payment.status) {
      await this.paymentRepo.update({
        id: paymentId,
        update: {
          status: newStatus,
          mvolaResponse: mvolaStatus,
          ...(newStatus === PaymentStatus.FAILED && { failureReason: mvolaStatus.status }),
        },
      });

      if (newStatus === PaymentStatus.SUCCESS) {
        await this.handlePaymentSuccess(
          paymentId,
          payment.cartId,
          payment.userId?.toString(),
        );
      }
    }

    return this.paymentRepo.findById({ id: paymentId });
  }

  // ── 4. Expirer un paiement ──────────────────────────────────────────
  async expire(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) {
      throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);
    }

    if (![PaymentStatus.PENDING, PaymentStatus.WAITING].includes(payment.status)) {
      throw new BadRequestException(
        'Seul un paiement en cours peut être marqué comme expiré',
      );
    }

    await this.paymentRepo.update({
      id: paymentId,
      update: { status: PaymentStatus.EXPIRED },
    });

    return this.paymentRepo.findById({ id: paymentId });
  }

  // ── 5. Régénérer une facture manuellement ───────────────────────────
  async regenerateInvoice(paymentId: string): Promise<void> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) {
      throw new NotFoundException(`Paiement ${paymentId} introuvable`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Impossible de créer une facture pour un paiement non réussi',
      );
    }

    const existingInvoice = await this.invoiceService.findByPaymentId(paymentId);
    if (existingInvoice) {
      throw new BadRequestException(
        `Une facture existe déjà pour ce paiement: ${existingInvoice.invoiceNumber}`,
      );
    }

    await this.createInvoiceForPayment(paymentId, payment.userId?.toString());
  }

  // ── Privé : orchestration post-paiement réussi ─────────────────────
  //
  // Ordre intentionnel :
  //   1️⃣  Facture  — idempotente (contrainte unique + catch 11000).
  //                  Sert de verrou : si callback et polling arrivent
  //                  simultanément, le second obtient la facture existante
  //                  sans déclencher la suite.
  //   2️⃣  Stock    — seulement si la facture est créée (ou déjà existante).
  //                  Évite une déduction orpheline si la création de facture
  //                  échoue pour une raison autre que le duplicate key.
  //   3️⃣  Panier   — soft-delete en dernier, non critique.
  //
  private async handlePaymentSuccess(
    paymentId: string,
    cartId: Types.ObjectId,
    userId?: string,
  ): Promise<void> {
    try {
      // 1️⃣ Facture en premier — point de synchronisation entre callback et polling
      await this.createInvoiceForPayment(paymentId, userId);

      // 2️⃣ Déduction stock seulement après facture confirmée
      await this.deductStockFromCart(cartId, userId);

      // 3️⃣ Soft-delete panier
      await this.cartService.softDeleteCartById(cartId);
    } catch (error) {
      this.logger.error(
        `Échec du traitement post-paiement pour ${paymentId}`,
        error,
      );
    }
  }

  // ── Privé : créer la facture ────────────────────────────────────────
  private async createInvoiceForPayment(
    paymentId: string,
    userId?: string,
  ): Promise<void> {
    try {
      await this.invoiceService.createInvoiceFromPayment({ paymentId, userId });
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création de facture pour le paiement ${paymentId}:`,
        error.stack || error.message,
      );
      throw error;
    }
  }

  // ── Privé : déduire le stock du panier ─────────────────────────────
  private async deductStockFromCart(
    cartId: Types.ObjectId,
    userId?: string,
  ): Promise<void> {
    const cart = await this.cartRepo.findById({
      id: cartId,
      options: { populate: [{ path: 'items.product' }] },
    });

    if (!cart || !cart.items?.length) return;

    for (const item of cart.items) {
      const product: any = item.product;

      if (!product?.trackStock) continue;

      try {
        await this.inventoryService.stockOut(
          {
            productId: product._id.toString(),
            quantity: item.quantity,
            reason: 'Vente - Paiement réussi',
            reference: `CART-${cart._id}`,
          },
          userId,
        );
      } catch (error) {
        this.logger.error(
          `❌ Échec de déduction de stock pour produit ${product._id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw new Error(`Échec de déduction de stock pour le produit ${product._id}`);
      }
    }
  }
}