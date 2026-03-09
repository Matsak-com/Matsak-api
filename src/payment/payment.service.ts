import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

import { ERRORS } from '../common/errors';
import { PaymentRepository } from './payment.repository';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  DeliveryMethod,
} from './payment.schema';
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
  deliveryMethod: DeliveryMethod;
  deliveryAddressId?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly callbackBaseUrl: string;

  // ── Set en mémoire des paymentId en cours de post-traitement ──────────────
  // Protège contre la race condition callback + polling simultanés.
  // En multi-instance, remplacer par un verrou Redis (redlock).
  private readonly processingLocks = new Set<string>();

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

  // ── 1. Initier un paiement Mvola ───────────────────────────────────────────
  async initiate(input: InitPaymentInput): Promise<Payment> {
    const { cartId, userId, customerPhone, deliveryMethod, deliveryAddressId } = input;
    let paymentId: string | null = null;

    try {
      const cart = await this.cartRepo.findById({
        id: new Types.ObjectId(cartId),
        options: { populate: [{ path: 'items.product' }] },
      });

      if (!cart || cart.deleted_at) throw new NotFoundException(ERRORS.CART_NOT_FOUND);
      if (!cart.items?.length) throw new BadRequestException(ERRORS.CART_EMPTY);

      if (deliveryMethod === DeliveryMethod.DELIVERY && !deliveryAddressId) {
        throw new BadRequestException('Une adresse de livraison est requise');
      }

      let totalAmount = 0;
      for (const item of cart.items) {
        const product = item.product as any;
        const pricing = this.productService.calculatePrice(product, item.quantity);
        totalAmount += pricing.totalPrice;
      }

      if (totalAmount <= 0) throw new BadRequestException(ERRORS.INVALID_AMOUNT);

      const existingActive = await this.paymentRepo.findOne({
        filter: {
          cartId: new Types.ObjectId(cartId),
          status: { $in: [PaymentStatus.PENDING, PaymentStatus.WAITING] },
        },
      });

      if (existingActive) throw new BadRequestException(ERRORS.PAYMENT_ALREADY_IN_PROGRESS);

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
          deliveryMethod,
          ...(deliveryMethod === DeliveryMethod.DELIVERY && deliveryAddressId
            ? { deliveryAddressId: new Types.ObjectId(deliveryAddressId) }
            : {}),
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
        const keyValue = (error as any)?.keyValue as Record<string, unknown> | undefined;
        const duplicateField = keyValue ? Object.keys(keyValue)[0] : 'unknown';
        const duplicateValue = keyValue?.[duplicateField];

        // Log interne détaillé — utile pour déboguer sans exposer au client
        this.logger.error(
          `Duplicate key error — field: "${duplicateField}", value: "${duplicateValue}"`,
          { keyValue, collection: 'payments' },
        );

        // Message client : précis selon le champ, sans exposer l'architecture interne
        const clientMessage = this.resolveDuplicateClientMessage(duplicateField);
        throw new BadRequestException(clientMessage);
      }

      this.logger.error('Error initiating payment', error);
      throw error;
    }
  }

  // ── 2. Callback Mvola ──────────────────────────────────────────────────────
  async handleCallback(callbackData: Record<string, any>): Promise<void> {
    this.logger.log('Callback Mvola reçu', JSON.stringify(callbackData));

    const { serverCorrelationId, status } = callbackData;

    if (!serverCorrelationId) {
      this.logger.warn('Callback sans serverCorrelationId — ignoré');
      return;
    }

    const payment = await this.paymentRepo.findOne({ filter: { serverCorrelationId } });

    if (!payment) {
      this.logger.warn(`Callback pour serverCorrelationId inconnu: ${serverCorrelationId}`);
      return;
    }

    if ([PaymentStatus.SUCCESS, PaymentStatus.FAILED].includes(payment.status)) {
      this.logger.warn(`Callback dupliqué ignoré — statut déjà: ${payment.status}`);
      return;
    }

    if (status !== 'COMPLETED') {
      await this.paymentRepo.update({
        id: payment._id.toString(),
        update: { status: PaymentStatus.FAILED, mvolaResponse: callbackData, failureReason: status },
      });
      return;
    }

    const transitioned = await this.paymentRepo.transitionStatus({
      id: payment._id.toString(),
      fromStatus: payment.status,
      toStatus: PaymentStatus.SUCCESS,
      update: { mvolaResponse: callbackData },
    });

    if (!transitioned) {
      this.logger.warn(`Payment ${payment._id} already transitioned (callback), skipping`);
      return;
    }

    // transitionStatus a réussi → ce processus est le seul propriétaire
    await this.runPostPaymentProcessing(payment._id.toString(), payment.cartId, payment.userId?.toString());
  }

  // ── 3. Polling ─────────────────────────────────────────────────────────────
  async pollStatus(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);

    if ([PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.EXPIRED].includes(payment.status)) {
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
      const transitioned = await this.paymentRepo.transitionStatus({
        id: paymentId,
        fromStatus: payment.status,
        toStatus: newStatus,
        update: {
          mvolaResponse: mvolaStatus,
          ...(newStatus === PaymentStatus.FAILED && { failureReason: mvolaStatus.status }),
        },
      });

      if (!transitioned) {
        // Un autre processus (callback) a déjà transitionné — pas de post-traitement ici
        this.logger.warn(`Payment ${paymentId} already transitioned (poll), skipping`);
        return this.paymentRepo.findById({ id: paymentId });
      }

      if (newStatus === PaymentStatus.SUCCESS) {
        await this.runPostPaymentProcessing(paymentId, payment.cartId, payment.userId?.toString());
      }
    }

    return this.paymentRepo.findById({ id: paymentId });
  }

  // ── Résoudre le message client pour une erreur de doublon MongoDB ────────────
  // Sépare ce qui est loggé en interne (champ exact, valeur) de ce qui
  // est retourné au client (message métier sans détail d'implémentation).
  private resolveDuplicateClientMessage(duplicateField: string): string {
    const messages: Record<string, string> = {
      // Index unique sur transactionReference — ne devrait jamais arriver
      // car on génère un uuidv4 frais à chaque initiate()
      transactionReference: ERRORS.PAYMENT_DUPLICATE,

      // Index partiel unique_active_payment_per_cart — un paiement
      // PENDING/WAITING existe déjà pour ce panier
      'cartId_1_status_1': ERRORS.PAYMENT_ALREADY_IN_PROGRESS,
    };

    return messages[duplicateField] ?? ERRORS.PAYMENT_DUPLICATE;
  }

  // ── Post-traitement unifié avec verrou en mémoire ──────────────────────────
  // Appelé uniquement par le processus qui a réussi transitionStatus.
  // Le verrou en mémoire évite la double exécution si callback + poll
  // arrivent dans la même instance Node.js avec un léger décalage.
  private async runPostPaymentProcessing(
    paymentId: string,
    cartId: Types.ObjectId,
    userId?: string,
  ): Promise<void> {
    if (this.processingLocks.has(paymentId)) {
      this.logger.warn(`Post-traitement déjà en cours pour ${paymentId} — ignoré`);
      return;
    }

    this.processingLocks.add(paymentId);

    try {
      this.logger.log(`▶ Post-traitement démarré pour paiement ${paymentId}`);

      await this.deductStockFromCart(cartId, userId);
      this.logger.log(`✅ Stock déduit pour paiement ${paymentId}`);

      await this.createInvoiceForPayment(paymentId);
      this.logger.log(`✅ Facture créée pour paiement ${paymentId}`);

      await this.cartService.softDeleteCartById(cartId);
      this.logger.log(`✅ Panier archivé pour paiement ${paymentId}`);

    } catch (error) {
      this.logger.error(`❌ Échec post-traitement pour paiement ${paymentId}`, error);
    } finally {
      // Libérer le verrou après un délai court pour absorber
      // d'éventuels appels en double arrivant avec ≤ 500ms d'écart
      setTimeout(() => this.processingLocks.delete(paymentId), 500);
    }
  }

  // ── 4. Expirer un paiement ────────────────────────────────────────────────
  async expire(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);

    if (![PaymentStatus.PENDING, PaymentStatus.WAITING].includes(payment.status)) {
      throw new BadRequestException('Seul un paiement en cours peut être marqué comme expiré');
    }

    await this.paymentRepo.update({ id: paymentId, update: { status: PaymentStatus.EXPIRED } });
    return this.paymentRepo.findById({ id: paymentId });
  }

  // ── Créer une facture ─────────────────────────────────────────────────────
  private async createInvoiceForPayment(paymentId: string): Promise<void> {
    try {
      await this.invoiceService.createInvoiceFromPayment({ paymentId });
    } catch (error) {
      this.logger.error(
        `Erreur création facture pour paiement ${paymentId}:`,
        error.stack || error.message,
      );
      throw error;
    }
  }

  // ── Régénérer une facture manuellement ────────────────────────────────────
  async regenerateInvoice(paymentId: string): Promise<void> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) throw new NotFoundException(`Paiement ${paymentId} introuvable`);

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Impossible de créer une facture pour un paiement non réussi');
    }

    const existingInvoice = await this.invoiceService.findByPaymentId(paymentId);
    if (existingInvoice) {
      throw new BadRequestException(
        `Une facture existe déjà pour ce paiement: ${existingInvoice.invoiceNumber}`,
      );
    }

    await this.createInvoiceForPayment(paymentId);
  }

  // ── Déduire le stock ──────────────────────────────────────────────────────
  private async deductStockFromCart(cartId: Types.ObjectId, userId?: string): Promise<void> {
    const cart = await this.cartRepo.findById({
      id: cartId,
      options: { populate: [{ path: 'items.product' }] },
    });

    if (!cart?.items?.length) return;

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
        this.logger.error(`❌ Échec déduction stock produit ${product._id}: ${error.message}`);
      }
    }
  }
}
