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
import { CartService } from '../cart-item/cart.service'; // ✅ Ajouter
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
    private readonly cartService: CartService, // ✅ Ajouter
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
    throw new Error('Method not implemented.');
  }

  // ── 1. Initier un paiement Mvola ───────────────────────────────────
  async initiate(input: InitPaymentInput): Promise<Payment> {
    const { cartId, userId, customerPhone } = input;
    let paymentId: string | null = null;

    try {
      // Step 1: Vérifier que le panier existe et n'est pas supprimé
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

      // Step 2: Calculer le montant total avec les prix et discounts réels
      let totalAmount = 0;

      for (const item of cart.items) {
        const product = item.product as any;
        const pricing = this.productService.calculatePrice(
          product,
          item.quantity,
        );
        totalAmount += pricing.totalPrice;
      }

      if (totalAmount <= 0) {
        throw new BadRequestException(ERRORS.INVALID_AMOUNT);
      }

      // Step 3: Vérifier qu'il n'y a pas déjà un paiement actif pour ce panier
      const existingActive = await this.paymentRepo.findOne({
        filter: {
          cartId: new Types.ObjectId(cartId),
          status: { $in: [PaymentStatus.PENDING, PaymentStatus.WAITING] },
        },
      });

      if (existingActive) {
        throw new BadRequestException(ERRORS.PAYMENT_ALREADY_IN_PROGRESS);
      }

      // Step 4: Créer l'enregistrement Payment en PENDING
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

      // Step 5: Appeler l'API Mvola
      const mvolaResponse = await this.mvolaApiService.initMerchantPay({
        amount: totalAmount,
        customerPhone,
        transactionReference,
        correlationId,
        callbackUrl: `${this.callbackBaseUrl}/payments/callback`,
        descriptionText: `Commande - Panier ${cartId}`,
      });

      // Step 6: Mettre à jour avec serverCorrelationId → WAITING
      await this.paymentRepo.update({
        id: paymentId,
        update: {
          serverCorrelationId: mvolaResponse.serverCorrelationId,
          status: PaymentStatus.WAITING,
          mvolaResponse,
        },
      });

      // Step 7: Retourner le payment populé
      return this.paymentRepo.findById({ id: paymentId });
    } catch (error) {
      // Rollback si l'erreur arrive après la création du Payment
      if (paymentId) {
        try {
          await this.paymentRepo.update({
            id: paymentId,
            update: {
              status: PaymentStatus.FAILED,
              failureReason: error.message,
            },
          });
        } catch (cleanupError) {
          this.logger.error(
            `Failed to rollback payment ${paymentId}`,
            cleanupError,
          );
        }
      }

      if ((error as any).code === 11000) {
        throw new BadRequestException(ERRORS.PAYMENT_DUPLICATE);
      }

      this.logger.error('Error initiating payment', error);
      throw error;
    }
  }

  // ── 2. Callback Mvola — reçu quand le client confirme ──────────────
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
      this.logger.warn(
        `Callback pour serverCorrelationId inconnu: ${serverCorrelationId}`,
      );
      return;
    }

    const newStatus =
      status === 'COMPLETED' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

    // Mettre à jour le statut du paiement
    await this.paymentRepo.update({
      id: payment._id.toString(),
      update: {
        status: newStatus,
        mvolaResponse: callbackData,
        ...(newStatus === PaymentStatus.FAILED && { failureReason: status }),
      },
    });

    // ✅ CRÉER LA FACTURE ET SOFT DELETE DU PANIER SI LE PAIEMENT EST RÉUSSI
if (newStatus === PaymentStatus.SUCCESS) {
  try {
    // 1️⃣ Déduire le stock AVANT la création de facture
    await this.deductStockFromCart(
      payment.cartId, 
      payment.userId?.toString()
    );
    
    // 2️⃣ Créer la facture
    await this.createInvoiceForPayment(payment._id.toString());
    
    // 3️⃣ Soft delete du panier APRÈS
    await this.cartService.softDeleteCartById(payment.cartId);
  } catch (error) {
    this.logger.error(
      `Échec du traitement post-paiement pour ${payment._id}`,
      error,
    );
  }
}
  }

  // ── 3. Polling — vérifier le statut (fallback si callback pas reçu) ─
  async pollStatus(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) {
      throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);
    }

    // Déjà terminé → retourner directement
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

    // Interroger Mvola pour le statut réel
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
          ...(newStatus === PaymentStatus.FAILED && {
            failureReason: mvolaStatus.status,
          }),
        },
      });

      // ✅ CRÉER LA FACTURE ET SOFT DELETE DU PANIER SI LE STATUT DEVIENT SUCCESS
      if (newStatus === PaymentStatus.SUCCESS) {
        try {
          // 1️⃣ Déduire le stock AVANT la création de facture
          await this.deductStockFromCart(
            payment.cartId,
            payment.userId?.toString()
          );
          
          // 2️⃣ Créer la facture
          await this.createInvoiceForPayment(paymentId);
          
          // 3️⃣ Soft delete du panier APRÈS
          await this.cartService.softDeleteCartById(payment.cartId);
        } catch (error) {
          this.logger.error(
            `Échec du traitement post-paiement pour ${paymentId}`,
            error,
          );
        }
      }
    }

    return this.paymentRepo.findById({ id: paymentId });
  }

  // ── 4. Marquer un paiement comme expiré ────────────────────────────
  async expire(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) {
      throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);
    }

    if (
      ![PaymentStatus.PENDING, PaymentStatus.WAITING].includes(payment.status)
    ) {
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

  // ══════════════════════════════════════════════════════════════════
  // ✅ MÉTHODE PRIVÉE : Créer une facture pour un paiement réussi
  // ══════════════════════════════════════════════════════════════════
  private async createInvoiceForPayment(paymentId: string): Promise<void> {

    try {
      const invoice = await this.invoiceService.createInvoiceFromPayment({
        paymentId,
      });

    } catch (error) {
      this.logger.error(
        `Erreur détaillée lors de la création de facture pour le paiement ${paymentId}:`,
        error.stack || error.message,
      );
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // ✅ MÉTHODE PUBLIQUE : Régénérer une facture manuellement
  // ══════════════════════════════════════════════════════════════════
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

    // Vérifier si une facture existe déjà
    const existingInvoice = await this.invoiceService.findByPaymentId(paymentId);
    if (existingInvoice) {
      throw new BadRequestException(
        `Une facture existe déjà pour ce paiement: ${existingInvoice.invoiceNumber}`,
      );
    }

    await this.createInvoiceForPayment(paymentId);
  }

  // ══════════════════════════════════════════════════════════════════
  // ✅ MÉTHODE PRIVÉE : Déduire le stock pour tous les produits du panier
  // ══════════════════════════════════════════════════════════════════
  private async deductStockFromCart(cartId: Types.ObjectId, userId?: string): Promise<void> {
    try {
      // 1️⃣ Récupérer le panier avec les items populés
      const cart = await this.cartRepo.findById({
        id: cartId,
        options: { populate: [{ path: 'items.product' }] },
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        this.logger.warn(`Panier ${cartId} vide ou introuvable, aucune déduction de stock`);
        return;
      }

      // 2️⃣ Parcourir chaque item et déduire le stock
      for (const item of cart.items) {
        const product = item.product as any;
  
        try {
          // Déduire le stock via InventoryService
          await this.inventoryService.stockOut(
            {
              productId: product._id.toString(),
              quantity: item.quantity,
              reason: 'Vente - Paiement réussi',
              reference: `CART-${cartId}`,
            },
            userId, // L'utilisateur qui a effectué l'achat
          );

        } catch (stockError) {
          // Ne pas bloquer le processus si un produit a un stock insuffisant
          // On log juste l'erreur
          this.logger.error(
            `❌ Échec de déduction de stock pour produit ${product._id}: ${stockError.message}`,
          );
          
          // Si c'est critique, vous pouvez throw pour annuler le paiement
          // throw stockError;
        }
      }
    } catch (error) {
      this.logger.error(
        `Erreur lors de la déduction de stock pour le panier ${cartId}:`,
        error.stack || error.message,
      );
      throw error;
    }
  }
}