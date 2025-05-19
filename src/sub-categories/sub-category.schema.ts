import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from 'src/categories/category.schema';

export type SubCategoryDocument = SubCategory & Document;

@Schema()
export class SubCategory {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;


}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);


