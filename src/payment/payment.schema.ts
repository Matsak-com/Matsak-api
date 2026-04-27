import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type {
  PricingLineSnapshot,
  PromoCodeSnapshot,
} from '../invoice/invoice.schema';

export enum PaymentStatus {
  PENDING = 'PENDING',
  WAITING = 'WAITING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentMethod {
  MVOLA = 'MVOLA',
}

export enum DeliveryMethod {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

// ══════════════════════════════════════════════════════════════
// PRICING SNAPSHOT — figé au moment de la création du Payment,
// avant l'envoi à Mvola. Copié tel quel dans l'Invoice au callback.
// ══════════════════════════════════════════════════════════════
export class PaymentPricingSnapshot {
  /** ISO currency code (ex: 'MGA') */
  currency: string;

  /** 1 EUR = X currency au moment du paiement */
  exchangeRate: number;

  exchangeRateSnapshotAt: Date;

  /** Sous-total articles en EUR */
  subtotalEur: number;

  /** Sous-total articles en devise locale */
  subtotalLocal: number;

  /** Lignes de surcharges (livraison, service, haute demande…) */
  pricingLines: PricingLineSnapshot[];

  surchargesTotalEur: number;
  surchargesTotalLocal: number;

  /** Remise promo code en EUR */
  discountEur: number;

  /** Remise promo code en devise locale */
  discountLocal: number;

  /** Snapshot immutable du promo code utilisé, null si aucun */
  promoCodeSnapshot: PromoCodeSnapshot | null;

  /** Total final en EUR  (= amount converti) */
  totalEur: number;

  /**
   * Total final en devise locale.
   * DOIT être strictement égal à Payment.amount.
   * Assertion vérifiée dans PaymentService.initiate() :
   *   assert(pricingSnapshot.totalLocal === amount)
   */
  totalLocal: number;
}

@Schema({ timestamps: true, optimisticConcurrency: true })
export class Payment {
  _id?: Types.ObjectId;
  __v?: number;

  @Prop({ type: Types.ObjectId, ref: 'Cart', required: true, index: true })
  cartId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', sparse: true, index: true })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: true, enum: PaymentMethod })
  method: PaymentMethod;

  /**
   * Montant envoyé à Mvola, en devise locale.
   * Source unique de vérité : pricingSnapshot.totalLocal.
   * Les deux doivent être identiques (vérification dans le service).
   */
  @Prop({ type: Number, required: true, min: 1 })
  amount: number;

  @Prop({ type: String, required: true, default: 'Ar' })
  currency: string;

  @Prop({
    type: String,
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  // ── Delivery ──────────────────────────────────────────────────────────────

  @Prop({
    type: String,
    required: true,
    enum: DeliveryMethod,
    default: DeliveryMethod.DELIVERY,
  })
  deliveryMethod: DeliveryMethod;

  @Prop({ type: Types.ObjectId, ref: 'Address', sparse: true })
  deliveryAddressId?: Types.ObjectId;

  // ══════════════════════════════════════════════════════════════
  // PRICING SNAPSHOT
  // Stocké ici pour que l'Invoice puisse le copier sans recalculer.
  // ══════════════════════════════════════════════════════════════
  @Prop({
    required: true,
    _id: false,
    type: {
      currency: { type: String, required: true },
      exchangeRate: { type: Number, required: true },
      exchangeRateSnapshotAt: { type: Date, required: true },

      subtotalEur: { type: Number, required: true, min: 0 },
      subtotalLocal: { type: Number, required: true, min: 0 },

      pricingLines: [
        {
          type: { type: String, required: true },
          name: { type: String, required: true },
          basePriceEur: { type: Number, required: true },
          localPrice: { type: Number, required: true },
          _id: false,
        },
      ],
      surchargesTotalEur: { type: Number, required: true, default: 0 },
      surchargesTotalLocal: { type: Number, required: true, default: 0 },

      discountEur: { type: Number, required: true, default: 0 },
      discountLocal: { type: Number, required: true, default: 0 },
      promoCodeSnapshot: {
        type: {
          code: { type: String, required: true },
          discountType: { type: String, required: true },
          discountValue: { type: Number, required: true },
        },
        default: null,
        _id: false,
      },

      totalEur: { type: Number, required: true, min: 0 },
      totalLocal: { type: Number, required: true, min: 0 },
    },
  })
  pricingSnapshot: PaymentPricingSnapshot;

  // ── Mvola-specific fields ─────────────────────────────────────────────────

  @Prop({ type: String, sparse: true, index: true })
  serverCorrelationId?: string;

  @Prop({ type: String, sparse: true })
  correlationId?: string;

  @Prop({ type: String, sparse: true })
  customerPhone?: string;

  @Prop({ type: String, sparse: true, unique: true })
  transactionReference?: string;

  @Prop({ type: String, sparse: true })
  failureReason?: string;

  @Prop({ type: Object, sparse: true })
  mvolaResponse?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index(
  { cartId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [PaymentStatus.PENDING, PaymentStatus.WAITING] },
    },
    name: 'unique_active_payment_per_cart',
  },
);

PaymentSchema.index(
  { serverCorrelationId: 1 },
  { sparse: true, name: 'idx_server_correlation_id' },
);

PaymentSchema.index(
  { userId: 1, status: 1 },
  { name: 'idx_user_payments_by_status' },
);
