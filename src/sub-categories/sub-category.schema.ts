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

  @ManyToOne(() => Category, (category) => category.subCategories, { onDelete: 'CASCADE' })
  category: Category;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
function ManyToOne(arg0: () => typeof Category, arg1: (category: any) => any, arg2: { onDelete: string; }): (target: SubCategory, propertyKey: "category") => void {
  throw new Error('Function not implemented.');
}

