import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',   // POST envoyé à Mvola, on attend
  WAITING = 'WAITING',   // USSD envoyé au client, on attend confirmation
  SUCCESS = 'SUCCESS',   // Callback reçu → payé
  FAILED = 'FAILED',     // Échec ou timeout
  EXPIRED = 'EXPIRED',   // QR / session expirée
}

export enum PaymentMethod {
  MVOLA = 'MVOLA',
}

export enum DeliveryMethod {
  DELIVERY = 'delivery',  // Livraison à domicile
  PICKUP = 'pickup',      // Retrait en pharmacie
}

@Schema({ timestamps: true, optimisticConcurrency: true })
export class Payment {
  _id?: Types.ObjectId;

  // ── Champ de version pour le verrouillage optimiste ──────────────────────
  // Mongoose incrémente __v à chaque save(). Si deux processus lisent
  // le même document et tentent de le sauvegarder, le second recevra
  // un VersionError que le service peut intercepter et rejeter.
  __v?: number;

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

  @Prop({
    type: String,
    required: true,
    enum: DeliveryMethod,
    default: DeliveryMethod.DELIVERY,
  })
  deliveryMethod: DeliveryMethod;

  @Prop({ type: Types.ObjectId, ref: 'Address', sparse: true })
  deliveryAddressId?: Types.ObjectId;

  // ── Mvola-specific fields ─────────────────────────────────────────────────

  @Prop({ type: String, sparse: true, index: true })
  serverCorrelationId?: string;

  @Prop({ type: String, sparse: true })
  correlationId?: string;

  @Prop({ type: String, sparse: true })
  customerPhone?: string;

  // unique: true garantit qu'aucune référence MVola ne peut être dupliquée
  @Prop({ type: String, sparse: true, unique: true })
  transactionReference?: string;

  @Prop({ type: String, sparse: true })
  failureReason?: string;

  @Prop({ type: Object, sparse: true })
  mvolaResponse?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// ── Index partiel : un seul paiement actif (PENDING/WAITING) par panier ──
//
// Rôle     : filet de sécurité base de données — empêche les doublons
//            même en cas de bug applicatif ou de requête concurrente directe.
//
// Limite   : MongoDB applique cet index au moment de l'INSERT, pas entre
//            le findOne() et le create(). Il peut donc y avoir une fenêtre
//            de race condition entre ces deux opérations. L'index attrapera
//            le doublon et lèvera une MongoServerError code 11000, que
//            PaymentService.initiate() intercepte et traduit en
//            BadRequestException (PAYMENT_DUPLICATE).
//
// Couche applicative complémentaire (dans PaymentService) :
//   1. findOne({ cartId, status: PENDING|WAITING })  → rejette en avance
//   2. transitionStatus({ fromStatus })               → findOneAndUpdate atomique
//   3. processingLocks Set                            → verrou en mémoire
//      (remplacer par redlock si déploiement multi-instances)
//
// Note     : `sparse: true` est retiré ici car partialFilterExpression
//            rend sparse redondant et peut créer une confusion sur
//            quels documents sont couverts par l'index.
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

// ── Index de recherche rapide par serverCorrelationId (callback Mvola) ────
PaymentSchema.index(
  { serverCorrelationId: 1 },
  {
    sparse: true,
    name: 'idx_server_correlation_id',
  },
);

// ── Index de recherche par userId + status (tableau de bord utilisateur) ──
PaymentSchema.index(
  { userId: 1, status: 1 },
  { name: 'idx_user_payments_by_status' },
);
