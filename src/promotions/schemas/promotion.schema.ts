import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PromotionStatus, PromotionType, DiscountType, PromotionScope } from '../enums';

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

  /** Which products this promotion applies to */
  @Prop({
    required: true,
    enum: Object.values(PromotionScope),
    default: PromotionScope.ALL,
    index: true,
  })
  applicableScope: PromotionScope;

  /** Specific product IDs (used when applicableScope = PRODUCTS) */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  productIds: Types.ObjectId[];

  /** Category IDs (used when applicableScope = CATEGORIES) */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  categoryIds: Types.ObjectId[];

  /** Minimum cart subtotal in EUR required to apply this promotion */
  @Prop({ type: Number, default: null, min: 0 })
  minCartAmountEur: number | null;

  /** Maximum number of times this promotion can be used (null = unlimited) */
  @Prop({ type: Number, default: null, min: 0 })
  maxUsageCount: number | null;

  /** Current number of times this promotion has been applied */
  @Prop({ type: Number, default: 0, min: 0 })
  usageCount: number;

  /** Storage key used to delete the file when replaced/deleted */
  @Prop({ type: String, default: null })
  imageFileKey: string | null;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

PromotionSchema.index({ status: 1, featured: 1 });
PromotionSchema.index({ createdAt: -1 });
