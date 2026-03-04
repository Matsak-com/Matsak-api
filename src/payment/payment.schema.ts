import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING', // POST envoyé à Mvola, on attend
  WAITING = 'WAITING', // USSD envoyé au client, on attend confirmation
  SUCCESS = 'SUCCESS', // Callback reçu → payé
  FAILED = 'FAILED', // Échec ou timeout
  EXPIRED = 'EXPIRED', // QR / session expirée
}

export enum PaymentMethod {
  MVOLA = 'MVOLA',
}

export enum DeliveryMethod {
  DELIVERY = 'delivery', // Livraison à domicile
  PICKUP = 'pickup', // Retrait en pharmacie
}

@Schema({ timestamps: true })
export class Payment {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Cart', required: true, index: true })
  cartId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', sparse: true, index: true })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: true, enum: PaymentMethod })
  method: PaymentMethod;

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

  // Choix du client : livraison à domicile ou retrait en pharmacie
  @Prop({
    type: String,
    required: true,
    enum: DeliveryMethod,
    default: DeliveryMethod.DELIVERY,
  })
  deliveryMethod: DeliveryMethod;

  // Adresse de livraison choisie (uniquement si deliveryMethod = 'delivery')
  @Prop({ type: Types.ObjectId, ref: 'Address', sparse: true })
  deliveryAddressId?: Types.ObjectId;

  // ── Mvola-specific fields ─────────────────────────────────────────────────

  @Prop({ type: String, sparse: true, index: true })
  serverCorrelationId?: string;

  @Prop({ type: String, sparse: true })
  correlationId?: string;

  @Prop({ type: String, sparse: true })
  customerPhone?: string;

  @Prop({ type: String, required: true, sparse: true, unique: true })
  transactionReference?: string;

  @Prop({ type: String, sparse: true })
  failureReason?: string;

  @Prop({ type: Object, sparse: true })
  mvolaResponse?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// ── Index composé : un seul paiement PENDING/WAITING par panier à la fois ──
PaymentSchema.index(
  { cartId: 1, status: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      status: { $in: [PaymentStatus.PENDING, PaymentStatus.WAITING] },
    },
  },
);
