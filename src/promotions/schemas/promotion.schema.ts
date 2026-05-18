import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PromotionStatus, PromotionType, DiscountType } from '../enums';

export type PromotionDocument = Promotion & Document;

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: null })
  description: string | null;

  @Prop({ required: true, enum: Object.values(PromotionType), index: true })
  type: PromotionType;

  @Prop({
    required: true,
    enum: Object.values(PromotionStatus),
    default: PromotionStatus.INACTIVE,
    index: true,
  })
  status: PromotionStatus;

  @Prop({ type: Number, default: null, min: 0 })
  discountValue: number | null;

  @Prop({ enum: Object.values(DiscountType), default: null })
  discountType: DiscountType | null;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ trim: true, default: null })
  imageUrl: string | null;

  @Prop({ trim: true, default: null })
  targetUrl: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Team', default: null, index: true })
  teamId: Types.ObjectId | null;

  @Prop({ required: true, default: false })
  featured: boolean;

  /** Storage key used to delete the file when replaced/deleted */
  @Prop({ type: String, default: null })
  imageFileKey: string | null;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

PromotionSchema.index({ status: 1, featured: 1 });
PromotionSchema.index({ createdAt: -1 });
