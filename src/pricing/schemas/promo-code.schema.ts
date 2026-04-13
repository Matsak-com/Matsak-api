import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromoCodeDocument = PromoCode & Document;

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_EUR = 'FIXED_EUR',
}

@Schema({ timestamps: true })
export class PromoCode {
  /** Unique promo code (case-insensitive stored as uppercase) */
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: /^[A-Z0-9_-]{3,30}$/,
    index: true,
  })
  code: string;

  @Prop({ trim: true, default: null })
  description: string | null;

  /** Scope this code to a specific team. Null → global. */
  @Prop({ type: Types.ObjectId, ref: 'Team', default: null, index: true })
  teamId: Types.ObjectId | null;

  @Prop({
    required: true,
    enum: Object.values(DiscountType),
  })
  discountType: DiscountType;

  /** % value (0–100) for PERCENTAGE, EUR amount for FIXED_EUR */
  @Prop({ required: true, type: Number, min: 0 })
  discountValue: number;

  /** Minimum order amount in EUR before promo applies */
  @Prop({ type: Number, min: 0, default: null })
  minOrderAmountEur: number | null;

  /** Max number of total redemptions. Null → unlimited. */
  @Prop({ type: Number, min: 1, default: null })
  maxUses: number | null;

  /** How many times this code has been redeemed */
  @Prop({ type: Number, default: 0, min: 0 })
  usedCount: number;

  @Prop({ required: true, type: Date })
  validFrom: Date;

  @Prop({ required: true, type: Date })
  validUntil: Date;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);

PromoCodeSchema.index({ code: 1, isActive: 1 });
PromoCodeSchema.index({ teamId: 1, isActive: 1 });
PromoCodeSchema.index({ validFrom: 1, validUntil: 1 });
