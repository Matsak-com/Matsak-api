import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DeliveryMethod } from '../payment/payment.schema';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

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
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ userId: 1, invoiceDate: -1 });
InvoiceSchema.index({ 'cartSnapshot.cartId': 1 });
InvoiceSchema.index({ 'cartSnapshot.items.product.team._id': 1 });