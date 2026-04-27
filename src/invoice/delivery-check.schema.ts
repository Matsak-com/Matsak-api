import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeliveryCheckDocument = DeliveryCheck & Document;

export enum DeliveryCheckType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

/**
 * One line-item in a delivery checklist.
 * `checkedAt` / `checkedBy` are populated when the delivery person confirms
 * that specific product has been handed over.
 */
export class DeliveryCheckItem {
  productId: Types.ObjectId;
  name: string;
  quantity: number;
  checkedAt?: Date;
  /** Free-text name/id the delivery person enters (no account required). */
  checkedBy?: string;
}

/**
 * Tracks the delivery verification process for one invoice (DELIVERY mode)
 * or one team within an invoice (PICKUP mode).
 *
 * The QR code embedded in the confirmation email encodes a signed JWT whose
 * `sub` is this document's `_id`.  The token is **never** stored in plain
 * text — only its SHA-256 hash (`tokenHash`) is persisted so it can be
 * revoked without exposing the credential.
 *
 * Security invariants:
 *  - Token is signed with DELIVERY_QR_SECRET (separate from JWT_SECRET).
 *  - Token lifetime is bounded by `expiresAt` (7 days).
 *  - `revoked` flag allows hard-revocation by admins.
 *  - `tokenHash` detects token-swap attacks (different token for same _id).
 */
@Schema({ timestamps: true })
export class DeliveryCheck {
  /**
   * Do NOT add @Prop here — Mongoose manages _id natively as ObjectId.
   * Explicitly decorating it with @Prop({ auto: true }) causes Mongoose to
   * replace the pre-computed docId with a new ObjectId on save, breaking
   * the JWT → DB lookup.
   */
  _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true,
  })
  invoiceId: Types.ObjectId;

  @Prop({ required: true, index: true })
  invoiceNumber: string;

  /**
   * Only set for PICKUP checks — identifies which pharmacy team this
   * checklist belongs to.
   */
  @Prop({ type: Types.ObjectId, ref: 'Team', required: false })
  teamId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(DeliveryCheckType),
    default: DeliveryCheckType.DELIVERY,
    index: true,
  })
  type: DeliveryCheckType;

  /** SHA-256 hex digest of the raw JWT string — never the token itself. */
  @Prop({ required: true, index: true })
  tokenHash: string;

  @Prop({
    required: true,
    type: [
      {
        productId: { type: Types.ObjectId, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        checkedAt: { type: Date, default: null },
        checkedBy: { type: String, default: null },
        _id: false,
      },
    ],
  })
  items: DeliveryCheckItem[];

  /** Set when every item has been checked, or when completeDelivery() is called. */
  @Prop({ required: false, default: null })
  completedAt?: Date;

  /** Token expiry — mirrors the JWT `exp` claim for a DB-side sanity check. */
  @Prop({ required: true, index: true })
  expiresAt: Date;

  /**
   * Hard-revocation flag.  Setting this to `true` immediately invalidates
   * the QR code even if the JWT has not yet expired.
   */
  @Prop({ required: true, default: false })
  revoked: boolean;
}

export const DeliveryCheckSchema = SchemaFactory.createForClass(DeliveryCheck);

// Compound index for admin queries (team invoices, etc.)
DeliveryCheckSchema.index({ invoiceId: 1, type: 1, teamId: 1 });
// TTL: automatically purge records 30 days after expiry (optional cleanup)
DeliveryCheckSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);
