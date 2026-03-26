import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

// ══════════════════════════════════════════════════════════════
// SNAPSHOT DU CART - Copie immuable au moment du paiement
// ══════════════════════════════════════════════════════════════
export class CartItemSnapshot {
  product: Types.ObjectId; // Référence conservée pour traçabilité
  quantity: number;
}

export class CartSnapshot {
  cartId: Types.ObjectId; // ID original du cart supprimé
  sessionId?: string; // Conservé si panier anonyme
  items: CartItemSnapshot[];
  snapshotAt: Date; // Moment de la copie
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
          product: { type: Types.ObjectId, ref: 'Product', required: true },
          quantity: { type: Number, required: true, min: 1 },
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
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ userId: 1, invoiceDate: -1 });
InvoiceSchema.index({ 'cartSnapshot.cartId': 1 }); // Retrouver une invoice depuis un cartId archivé
