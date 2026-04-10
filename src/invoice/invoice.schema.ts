import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PricingRuleType } from '../pricing/schemas/pricing-rule.schema';
import { DiscountType } from '../pricing/schemas/promo-code.schema';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

// ── Pricing sub-documents ─────────────────────────────────────────────────────

export class PricingLineSnapshot {
  type: PricingRuleType;
  name: string;
  basePriceEur: number;
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
  price: number; // ← prix figé au moment du paiement
}

export class CartSnapshot {
  cartId: Types.ObjectId;
  sessionId?: string;
  items: CartItemSnapshot[];
  snapshotAt: Date;
}

@Schema({ timestamps: true })
export class Invoice {
  // ══════════════════════════════════════════════════════════════
  // RÉFÉRENCES
  // ══════════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════════
  // SNAPSHOT DU CART (copie avant suppression)
  // ══════════════════════════════════════════════════════════════
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
              _id: false,
            },
          },
          _id: false,
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
  // ══════════════════════════════════════════════════════════════
  // FACTURE
  // ══════════════════════════════════════════════════════════════
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string;

  @Prop({ required: true, default: () => new Date() })
  invoiceDate: Date;

  // ══════════════════════════════════════════════════════════════
  // STATUT
  // ══════════════════════════════════════════════════════════════
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
  // PRICING SUMMARY (frozen at invoice creation)
  // ══════════════════════════════════════════════════════════════

  /** ISO currency code used by the team (default 'MGA') */
  @Prop({ required: false, default: 'MGA' })
  currency?: string;

  /** Exchange rate snapshot: 1 EUR = X currency */
  @Prop({ required: false, type: Number })
  exchangeRate?: number;

  @Prop({ required: false, type: Date })
  exchangeRateSnapshotAt?: Date;

  /** Cart items subtotal in EUR */
  @Prop({ required: false, type: Number, min: 0 })
  subtotalEur?: number;

  /** Cart items subtotal in local currency */
  @Prop({ required: false, type: Number, min: 0 })
  subtotalLocal?: number;

  /** Applied surcharge lines (delivery, services, high demand) */
  @Prop({
    required: false,
    type: [
      {
        type: { type: String, required: true },
        name: { type: String, required: true },
        basePriceEur: { type: Number, required: true },
        localPrice: { type: Number, required: true },
        _id: false,
      },
    ],
    default: [],
  })
  pricingLines?: PricingLineSnapshot[];

  @Prop({ required: false, type: Number, default: 0 })
  surchargesTotalEur?: number;

  @Prop({ required: false, type: Number, default: 0 })
  surchargesTotalLocal?: number;

  /** Discount in EUR from promo code */
  @Prop({ required: false, type: Number, default: 0 })
  discountEur?: number;

  @Prop({ required: false, type: Number, default: 0 })
  discountLocal?: number;

  /** Promo code used (immutable snapshot) */
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
  promoCodeSnapshot?: PromoCodeSnapshot | null;

  /** Grand total in EUR */
  @Prop({ required: false, type: Number, min: 0 })
  totalEur?: number;

  /** Grand total in team currency */
  @Prop({ required: false, type: Number, min: 0 })
  totalLocal?: number;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ userId: 1, invoiceDate: -1 });
InvoiceSchema.index({ 'cartSnapshot.cartId': 1 }); // Retrouver une invoice depuis un cartId archivé
