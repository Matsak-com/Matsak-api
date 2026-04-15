// cart.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// ✅ Utiliser HydratedDocument au lieu de Document
export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  _id?: Types.ObjectId;
  @Prop({
    type: String,
    sparse: true, // ← Permet null/undefined
    index: true, // ← Index pour performance
  })
  sessionId?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    sparse: true, // ← Permet null/undefined
    index: true, // ← Index pour performance
  })
  userId?: Types.ObjectId;

  @Prop({
    type: [
      {
        product: {
          type: Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1, // ← Validation : quantité >= 1
          default: 1,
        },
        _id: false, // ← Désactive l'auto-génération d'_id pour les sous-documents
      },
    ],
    default: [],
    validate: {
      validator: function (items: any[]) {
        // Vérifie qu'il n'y a pas de doublons de produits
        const productIds = items.map((item) => item.product.toString());
        return productIds.length === new Set(productIds).size;
      },
      message: 'Duplicate products in cart items',
    },
  })
  items: {
    product: Types.ObjectId;
    quantity: number;
  }[];

  @Prop({
    type: Date,
  })
  deleted_at?: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

// ✅ Index composé pour garantir l'unicité
// Un userId ne peut avoir qu'un seul panier actif
CartSchema.index(
  { userId: 1, deleted_at: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      userId: { $exists: true },
      deleted_at: null,
    },
  },
);

// Un sessionId ne peut avoir qu'un seul panier actif
CartSchema.index(
  { sessionId: 1, deleted_at: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      sessionId: { $exists: true },
      deleted_at: null,
    },
  },
);

// ✅ Index pour nettoyer les vieux paniers de session
CartSchema.index(
  { sessionId: 1, updatedAt: 1 },
  {
    sparse: true,
    expireAfterSeconds: 2592000,
  },
);

// ✅ Suppression automatique 24h après le soft delete
CartSchema.index(
  { deleted_at: 1 },
  {
    sparse: true, // ignore les documents où deleted_at n'existe pas
    expireAfterSeconds: 86400, // 24h = 24 * 60 * 60
  },
);
