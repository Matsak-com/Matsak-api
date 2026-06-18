import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PricingRuleType } from '../pricing/schemas/pricing-rule.schema';
import { DiscountType } from '../pricing/schemas/promo-code.schema';
import { DeliveryMethod } from '../payment/payment.schema';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

// ── Pricing sub-documents ─────────────────────────────────────────────────────
// Ces classes sont aussi importées par payment.schema.ts (PaymentPricingSnapshot).
// Ne pas les déplacer sans mettre à jour l'import dans payment.schema.ts.

export class PricingLineSnapshot {
  type: PricingRuleType;
  name: string;
  baseType: string;
  basePriceEur: number | null;
  basePercentage: number | null;
  /** Resolved surcharge amount in EUR at the time of the invoice */
  resolvedEur: number;
  localPrice: number;
}

export class PromoCodeSnapshot {
  code: string;
  discountType: DiscountType;
  discountValue: number;
}

// ══════════════════════════════════════════════════════════════
// SNAPSHOT DU CART - Copie immuable au moment du paiement
// ══════════════════════════════════════════════════════════════
export class CartItemProductSnapshot {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  team?: {
    _id: Types.ObjectId;
    name: string;
  };
}

export class CartItemSnapshot {
  product: CartItemProductSnapshot;
  quantity: number;
  price: number;
}

export class CartSnapshot {
  cartId: Types.ObjectId;
  sessionId?: string;
  items: CartItemSnapshot[];
  snapshotAt: Date;
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({
    type: Types.ObjectId,
    ref: 'Payment',
    required: true,
    unique: true,
    index: true,
  })
  payment: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  userId?: Types.ObjectId;

  @Prop({
    type: {
      cartId: { type: Types.ObjectId, required: true },
      sessionId: { type: String },
      items: [
        {
          product: {
            type: {
              _id: { type: Types.ObjectId, required: true },
              name: { type: String, required: true },
              description: { type: String },
              team: {
                type: {
                  _id: { type: Types.ObjectId },
                  name: { type: String },
                },
              },
            },
          },
          quantity: { type: Number, required: true, min: 1 },
          price: { type: Number, required: true, min: 0 },
          _id: false,
        },
      ],
      snapshotAt: { type: Date, required: true },
    },
    required: true,
    _id: false,
  })
  cartSnapshot: CartSnapshot;

  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string;

  @Prop({ required: true, default: () => new Date() })
  invoiceDate: Date;

  // ── Livraison — copié depuis Payment au moment de la création ─────────────
  @Prop({
    type: String,
    required: true,
    enum: Object.values(DeliveryMethod),
    default: DeliveryMethod.DELIVERY,
  })
  deliveryMethod: DeliveryMethod;

  @Prop({ type: Types.ObjectId, ref: 'Address', required: false })
  deliveryAddressId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.PAID,
    index: true,
  })
  status: InvoiceStatus;

  @Prop({ required: false })
  refundedAt?: Date;

  @Prop({ required: false })
  deleted_at?: Date;

  // ══════════════════════════════════════════════════════════════
  // PRICING SUMMARY
  // Ces champs sont TOUJOURS copiés depuis Payment.pricingSnapshot.
  // Ils ne sont JAMAIS recalculés au moment de la création de l'Invoice.
  //
  // Flow :
  //   Payment créé  → pricingSnapshot figé (subtotal, surcharges, discount, total)
  //   Mvola SUCCESS → Invoice.fromPaymentSnapshot(payment.pricingSnapshot)
  // ══════════════════════════════════════════════════════════════

  /** ISO currency code copié depuis Payment.pricingSnapshot.currency */
  @Prop({ required: true, default: 'MGA' })
  currency: string;

  /** 1 EUR = X currency — taux figé au moment du paiement */
  @Prop({ required: true, type: Number })
  exchangeRate: number;

  @Prop({ required: true, type: Date })
  exchangeRateSnapshotAt: Date;

  /** Sous-total articles en EUR */
  @Prop({ required: true, type: Number, min: 0 })
  subtotalEur: number;

  /** Sous-total articles en devise locale */
  @Prop({ required: true, type: Number, min: 0 })
  subtotalLocal: number;

  /** Lignes de surcharges appliquées */
  @Prop({
    required: true,
    type: [
      {
        type: { type: String, required: true },
        name: { type: String, required: true },
        baseType: { type: String, required: true, default: 'FIXED' },
        basePriceEur: { type: Number, default: null },
        basePercentage: { type: Number, default: null },
        resolvedEur: { type: Number, required: false, default: null },
        localPrice: { type: Number, required: true },
        _id: false,
      },
    ],
    default: [],
  })
  pricingLines: PricingLineSnapshot[];

  @Prop({ required: true, type: Number, default: 0 })
  surchargesTotalEur: number;

  @Prop({ required: true, type: Number, default: 0 })
  surchargesTotalLocal: number;

  /** Remise promo code en EUR */
  @Prop({ required: true, type: Number, default: 0 })
  discountEur: number;

  @Prop({ required: true, type: Number, default: 0 })
  discountLocal: number;

  /** Snapshot immutable du promo code utilisé, null si aucun */
  @Prop({
    required: false,
    type: {
      code: { type: String, required: true },
      discountType: { type: String, required: true },
      discountValue: { type: Number, required: true },
    },
    default: null,
    _id: false,
  })
  promoCodeSnapshot: PromoCodeSnapshot | null;

  /** Discount from a product-level Promotion */
  @Prop({ required: false, type: Number, default: 0 })
  promotionDiscountEur: number;

  @Prop({ required: false, type: Number, default: 0 })
  promotionDiscountLocal: number;

  @Prop({
    required: false,
    type: {
      promotionId: { type: String, required: true },
      title: { type: String, required: true },
      discountType: { type: String, required: true },
      discountValue: { type: Number, required: true },
      applicableScope: { type: String, required: true },
    },
    default: null,
    _id: false,
  })
  promotionSnapshot: {
    promotionId: string;
    title: string;
    discountType: string;
    discountValue: number;
    applicableScope: string;
  } | null;

  /**
   * Total final en EUR.
   * Doit correspondre à Payment.pricingSnapshot.totalEur.
   */
  @Prop({ required: true, type: Number, min: 0 })
  totalEur: number;

  /**
   * Total final en devise locale.
   * Doit être strictement égal à Payment.amount.
   * Invariant vérifié dans InvoiceService.createFromPayment() :
   *   assert(invoice.totalLocal === payment.amount)
   */
  @Prop({ required: true, type: Number, min: 0 })
  totalLocal: number;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ userId: 1, invoiceDate: -1 });
InvoiceSchema.index({ 'cartSnapshot.cartId': 1 });
InvoiceSchema.index({ 'cartSnapshot.items.product.team._id': 1 });
