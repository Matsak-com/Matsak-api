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
import { InvoiceService } from '../invoice/invoice.service';
import { CartService } from '../cart-item/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { PricingService, DEFAULT_CURRENCY } from '../pricing/pricing.service';

export interface InitPaymentInput {
  cartId: string;
  userId?: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddressId?: string;
  /** Promo code saisi par le client — stocké dans pricingSnapshot */
  promoCode?: string;
  /** Devise d'affichage — défaut MGA */
  currency?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly callbackBaseUrl: string;

  private readonly processingLocks = new Set<string>();

  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly cartRepo: CartRepository,
    private readonly cartService: CartService,
    private readonly mvolaApiService: MvolaApiService,
    private readonly configService: ConfigService,
    private readonly invoiceService: InvoiceService,
    private readonly inventoryService: InventoryService,
    private readonly pricingService: PricingService,
  ) {
    this.callbackBaseUrl = this.configService.get<string>(
      'APP_CALLBACK_BASE_URL',
      'http://localhost:3000',
    );
  }

  // ── 1. Initier un paiement Mvola ───────────────────────────────────────────
  async initiate(input: InitPaymentInput): Promise<Payment> {
    const {
      cartId,
      userId,
      customerPhone,
      deliveryMethod,
      deliveryAddressId,
      promoCode,
      currency = DEFAULT_CURRENCY,
    } = input;

    let paymentId: string | null = null;

    try {
      const cart = await this.cartRepo.findById({
        id: new Types.ObjectId(cartId),
        options: {
          populate: [
            {
              path: 'items.product',
              populate: [
                { path: 'detail', select: 'name' },
                { path: 'team', select: '_id name' },
              ],
            },
          ],
        },
      });

      if (!cart || cart.deleted_at)
        throw new NotFoundException(ERRORS.CART_NOT_FOUND);
      if (!cart.items?.length) throw new BadRequestException(ERRORS.CART_EMPTY);

      if (deliveryMethod === DeliveryMethod.DELIVERY && !deliveryAddressId) {
        throw new BadRequestException('Une adresse de livraison est requise');
      }

      // ── Calcul du pricing complet ─────────────────────────────────────────
      // Ce calcul a lieu UNE SEULE FOIS, ici, avant l'envoi à Mvola.
      // Le résultat est figé dans pricingSnapshot et ne sera jamais recalculé.
      const cartItems = cart.items as any[];

      const currencies = [
        ...new Set(
          cartItems.map((item: any) => item.product?.currency).filter(Boolean),
        ),
      ] as string[];

      if (currencies.length > 1) {
        this.logger.warn(
          `Panier ${cartId} contient des produits en devises mixtes (${currencies.join(', ')}); ` +
            `défaut MGA pour le sous-total`,
        );
      }

      const productCurrency: string = currencies[0] ?? 'MGA';

      const cartSubtotal = cartItems.reduce(
        (sum: number, item: any) =>
          sum + (item.product?.basePrice ?? 0) * (item.quantity ?? 1),
        0,
      );

      if (cartSubtotal <= 0)
        throw new BadRequestException(ERRORS.INVALID_AMOUNT);

      const teamId: string | null =
        cartItems[0]?.product?.team?._id?.toString() ?? null;

      const pricing = await this.pricingService.calculateTotal({
        cartSubtotalEur: cartSubtotal,
        currentCurrency: productCurrency,
        teamId,
        promoCode: promoCode ?? null,
        currency,
        deliveryMethod,
      });

      // ── Racheter le promo code atomiquement ───────────────────────────────
      if (promoCode && pricing.promoCodeSnapshot) {
        try {
          await this.pricingService.redeemPromoCode(
            promoCode,
            pricing.subtotalEur,
            teamId ?? undefined,
          );
        } catch (err: any) {
          this.logger.error(
            `Promo redemption failed for ${promoCode}`,
            err?.message,
          );
          throw new BadRequestException('Promo code could not be applied');
        }
      }

      const totalAmount = pricing.totalLocal;

      if (totalAmount <= 0)
        throw new BadRequestException(ERRORS.INVALID_AMOUNT);

      const existingActive = await this.paymentRepo.findOne({
        filter: {
          cartId: new Types.ObjectId(cartId),
          status: { $in: [PaymentStatus.PENDING, PaymentStatus.WAITING] },
        },
      });

      if (existingActive)
        throw new BadRequestException(ERRORS.PAYMENT_ALREADY_IN_PROGRESS);

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

          // ── Pricing snapshot figé ────────────────────────────────────────
          // Source de vérité pour la création de la facture.
          // InvoiceService copie ce bloc sans jamais recalculer.
          pricingSnapshot: {
            currency: pricing.currency,
            exchangeRate: pricing.exchangeRate,
            exchangeRateSnapshotAt: pricing.exchangeRateSnapshotAt,
            subtotalEur: pricing.subtotalEur,
            subtotalLocal: pricing.subtotalLocal,
            pricingLines: pricing.pricingLines,
            surchargesTotalEur: pricing.surchargesTotalEur,
            surchargesTotalLocal: pricing.surchargesTotalLocal,
            discountEur: pricing.discountEur,
            discountLocal: pricing.discountLocal,
            promoCodeSnapshot: pricing.promoCodeSnapshot,
            totalEur: pricing.totalEur,
            totalLocal: pricing.totalLocal, // === amount
          },
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
            update: {
              status: PaymentStatus.FAILED,
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
        const keyValue = (error as any)?.keyValue as
          | Record<string, unknown>
          | undefined;
        const duplicateField = keyValue ? Object.keys(keyValue)[0] : 'unknown';
        const duplicateValue = keyValue?.[duplicateField];

        this.logger.error(
          `Duplicate key error — field: "${duplicateField}", value: "${duplicateValue}"`,
          { keyValue, collection: 'payments' },
        );

        const clientMessage =
          this.resolveDuplicateClientMessage(duplicateField);
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

    const payment = await this.paymentRepo.findOne({
      filter: { serverCorrelationId },
    });

    if (!payment) {
      this.logger.warn(
        `Callback pour serverCorrelationId inconnu: ${serverCorrelationId}`,
      );
      return;
    }

    if (
      [PaymentStatus.SUCCESS, PaymentStatus.FAILED].includes(payment.status)
    ) {
      this.logger.warn(
        `Callback dupliqué ignoré — statut déjà: ${payment.status}`,
      );
      return;
    }

    if (status !== 'COMPLETED') {
      await this.paymentRepo.update({
        id: payment._id.toString(),
        update: {
          status: PaymentStatus.FAILED,
          mvolaResponse: callbackData,
          failureReason: status,
        },
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
      this.logger.warn(
        `Payment ${payment._id} already transitioned (callback), skipping`,
      );
      return;
    }

    await this.runPostPaymentProcessing(
      payment._id.toString(),
      payment.cartId,
      payment.userId?.toString(),
    );
  }

  // ── 3. Polling ─────────────────────────────────────────────────────────────
  async pollStatus(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);

    if (
      [
        PaymentStatus.SUCCESS,
        PaymentStatus.FAILED,
        PaymentStatus.EXPIRED,
      ].includes(payment.status)
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
      const transitioned = await this.paymentRepo.transitionStatus({
        id: paymentId,
        fromStatus: payment.status,
        toStatus: newStatus,
        update: {
          mvolaResponse: mvolaStatus,
          ...(newStatus === PaymentStatus.FAILED && {
            failureReason: mvolaStatus.status,
          }),
        },
      });

      if (!transitioned) {
        this.logger.warn(
          `Payment ${paymentId} already transitioned (poll), skipping`,
        );
        return this.paymentRepo.findById({ id: paymentId });
      }

      if (newStatus === PaymentStatus.SUCCESS) {
        await this.runPostPaymentProcessing(
          paymentId,
          payment.cartId,
          payment.userId?.toString(),
        );
      }
    }

    return this.paymentRepo.findById({ id: paymentId });
  }

  // ── 4. Expirer un paiement ────────────────────────────────────────────────
  async expire(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment) throw new NotFoundException(ERRORS.PAYMENT_NOT_FOUND);

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

  // ── Régénérer une facture manuellement ────────────────────────────────────
  async regenerateInvoice(paymentId: string): Promise<void> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment)
      throw new NotFoundException(`Paiement ${paymentId} introuvable`);

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Impossible de créer une facture pour un paiement non réussi',
      );
    }

    const existingInvoice =
      await this.invoiceService.findByPaymentId(paymentId);
    if (existingInvoice) {
      throw new BadRequestException(
        `Une facture existe déjà pour ce paiement: ${existingInvoice.invoiceNumber}`,
      );
    }

    await this.createInvoiceForPayment(paymentId);
  }

  // ── Résoudre le message client pour une erreur de doublon MongoDB ─────────
  private resolveDuplicateClientMessage(duplicateField: string): string {
    const messages: Record<string, string> = {
      transactionReference: ERRORS.PAYMENT_DUPLICATE,
      cartId_1_status_1: ERRORS.PAYMENT_ALREADY_IN_PROGRESS,
    };

    return messages[duplicateField] ?? ERRORS.PAYMENT_DUPLICATE;
  }

  // ── Post-traitement unifié avec verrou en mémoire ──────────────────────────
  private async runPostPaymentProcessing(
    paymentId: string,
    cartId: Types.ObjectId,
    userId?: string,
  ): Promise<void> {
    if (this.processingLocks.has(paymentId)) {
      this.logger.warn(
        `Post-traitement déjà en cours pour ${paymentId} — ignoré`,
      );
      return;
    }

    this.processingLocks.add(paymentId);

    try {
      this.logger.log(`▶ Post-traitement démarré pour paiement ${paymentId}`);

      await this.deductStockFromCart(cartId, userId);
      this.logger.log(`✅ Stock déduit pour paiement ${paymentId}`);

      await this.createInvoiceForPayment(paymentId, userId);
      this.logger.log(`✅ Facture créée pour paiement ${paymentId}`);

      await this.cartService.softDeleteCartById(cartId);
      this.logger.log(`✅ Panier archivé pour paiement ${paymentId}`);
    } catch (error) {
      this.logger.error(
        `❌ Échec post-traitement pour paiement ${paymentId}`,
        error,
      );
    } finally {
      setTimeout(() => this.processingLocks.delete(paymentId), 500);
    }
  }

  // ── Créer une facture ─────────────────────────────────────────────────────
  private async createInvoiceForPayment(paymentId: string, userId?: string): Promise<void> {
    try {
      await this.invoiceService.createInvoiceFromPayment({ paymentId }, userId);
    } catch (error) {
      const errorDetails =
        (error as Error)?.stack || (error as Error)?.message || String(error);

      this.logger.error(
        `Erreur création facture pour paiement ${paymentId}:`,
        errorDetails,
      );
      throw error;
    }
  }

  // ── Régénérer une facture manuellement ────────────────────────────────────
  async regenerateInvoice(paymentId: string, userId?: string,): Promise<void> {
    const payment = await this.paymentRepo.findById({ id: paymentId });

    if (!payment)
      throw new NotFoundException(`Paiement ${paymentId} introuvable`);

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Impossible de créer une facture pour un paiement non réussi',
      );
    }

    const existingInvoice =
      await this.invoiceService.findByPaymentId(paymentId);
    if (existingInvoice) {
      throw new BadRequestException(
        `Une facture existe déjà pour ce paiement: ${existingInvoice.invoiceNumber}`,
      );
    }

    const currentUserId = userId ?? undefined;
    await this.createInvoiceForPayment(paymentId, currentUserId);
  }

  // ── Déduire le stock ──────────────────────────────────────────────────────
  private async deductStockFromCart(
    cartId: Types.ObjectId,
    userId?: string,
  ): Promise<void> {
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
        this.logger.error(
          `❌ Échec déduction stock produit ${product._id}: ${(error as Error).message}`,
        );
      }
    }
  }
}
