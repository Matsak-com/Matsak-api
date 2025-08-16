import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DetailProduct } from '../detail-product/detail-product.schema';
import { SubCategory } from '../sub-categories/sub-category.schema';
import { ImageProduct } from '../image-product/image-product.schema';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  // Reference to DetailProduct
  @Prop({ type: Types.ObjectId, ref: DetailProduct.name })
  detail: Types.ObjectId;

  // Reference to SubCategory
  @Prop({ type: Types.ObjectId, ref: SubCategory.name })
  subcategory: Types.ObjectId;

  //references to ImageProduct
  @Prop({ type:Types.ObjectId, ref: ImageProduct.name  })
  images: Types.ObjectId;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
