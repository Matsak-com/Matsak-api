import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DetailProduct } from '../detail-product/detail-product.schema';
import { ImageProduct } from '../image-product/image-product.schema';

export type ProductDecondDocument = ProductDecond & Document;

@Schema({ timestamps: true })
export class ProductDecond {
  @Prop({ type: Types.ObjectId, ref: 'DetailProduct', required: true })
  detailProduct: DetailProduct | Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ImageProduct', required: true })
  image: ImageProduct | Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  description: string;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const ProductDecondSchema = SchemaFactory.createForClass(ProductDecond);
