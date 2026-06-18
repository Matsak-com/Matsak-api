import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { DetailProduct } from '../detail-product/detail-product.schema';
import { ImageProduct } from '../image-product/image-product.schema';

export type ProductDocument = Product & Document;

// Discount schema for embedded discounts
@Schema({ _id: false })
export class Discount {
  @Prop({ required: true, enum: ['percentage', 'fixed', 'bulk'] })
  type: 'percentage' | 'fixed' | 'bulk';

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  startDate?: Date;

  @Prop({ required: false })
  endDate?: Date;

  @Prop({ default: true })
  isActive: boolean; // isActive du discount, on ne touche pas

  @Prop({ required: false, min: 1 })
  minQuantity?: number;
}

@Schema({ timestamps: true })
export class Product {
  static findById() {}

  @Prop({ type: Types.ObjectId, ref: DetailProduct.name })
  detail: Types.ObjectId;

  @Prop([{ type: MongooseSchema.Types.ObjectId, ref: ImageProduct.name }])
  images: Types.ObjectId[];

  @Prop({ required: false, min: 0 })
  basePrice?: number;

  @Prop({ required: false, default: 'MGA' })
  currency?: string;

  @Prop({ type: [Discount], default: [] })
  discounts: Discount[];

  @Prop({ required: false })
  deleted_at?: Date;

  @Prop({ type: Number, default: 0, min: 0 })
  averageRating: number;

  @Prop({ type: Number, default: 0, min: 0 })
  reviewCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  stockQuantity: number;

  @Prop({ type: Number, default: 0, min: 0 })
  lowStockThreshold: number;

  @Prop({ type: Boolean, default: true })
  trackStock: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: true, index: true })
  team: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isPublished: boolean;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);
export const ProductSchema = SchemaFactory.createForClass(Product);