import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from '../categories/category.schema';
import { SubCategory } from 'src/sub-categories/sub-category.schema';

export type DetailProductDocument = DetailProduct & Document;

@Schema({ timestamps: true })
export class DetailProduct {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  composition: string;

  @Prop()
  form: string;

  @Prop()
  indications: string;

  @Prop()
  contraindications: string;

  @Prop()
  sideEffects: string;

  @Prop()
  precautions: string;

  @Prop()
  expirationDate: Date;

  @Prop()
  manufacturer: string;

  @Prop({ default: false })
  isRepackaged: boolean;

  @Prop({ 
    type: Types.ObjectId, 
    ref: Category.name,
    required: true,
    index: true 
  })
  category: Types.ObjectId;

  @Prop({ 
    type: Types.ObjectId, 
    ref: SubCategory.name,
    required: false,
    index: true 
  })
  subcategory?: Types.ObjectId;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const DetailProductSchema = SchemaFactory.createForClass(DetailProduct);

DetailProductSchema.index({ category: 1, subcategory: 1 });