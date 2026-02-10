import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

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

@Schema({ timestamps: true })
export class Payment {
  _id?: Types.ObjectId;

  // Référence vers le panier concerné
  @Prop({
    type: Types.ObjectId,
    ref: 'Cart',
    required: true,
    index: true,
  })
  cartId: Types.ObjectId;

  // Référence vers l'utilisateur (optionnel si session anonyme)
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true,
  })
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

  // ── Mvola-specific fields ──────────────────────────────────────

  // serverCorrelationId retourné par Mvola après le POST (utilisé pour le polling)
  @Prop({ type: String, sparse: true, index: true })
  serverCorrelationId?: string;

  // X-CorrelationID qu'on envoie dans le header (notre UUID interne)
  @Prop({ type: String, sparse: true })
  correlationId?: string;

  // Numéro du client qui paie (debitParty)
  @Prop({ type: String, sparse: true })
  customerPhone?: string;

  // Référence de transaction qu'on génère nous-mêmes
  @Prop({ type: String, sparse: true, unique: true })
  transactionReference?: string;

  // Raison d'échec (si status = FAILED)
  @Prop({ type: String, sparse: true })
  failureReason?: string;

  // Raw response de Mvola (pour debug)
  @Prop({ type: Object, sparse: true })
  mvolaResponse?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Index composé : un seul paiement PENDING/WAITING par panier à la fois
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
