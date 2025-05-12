import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SubCategory } from 'src/sub-categories/sub-category.schema';

export type CategoryDocument = Category & Document;

@Schema()
export class Category {
  @Prop({ required: true })
  name: string;

  
  @OneToMany(() => SubCategory, (subCategory) => subCategory.category, { cascade: true })
  subCategories: SubCategory[];

}

export const CategorySchema = SchemaFactory.createForClass(Category);
function OneToMany(arg0: () => typeof SubCategory, arg1: (subCategory: any) => any, arg2: { cascade: boolean; }): (target: Category, propertyKey: "subCategories") => void {
  throw new Error('Function not implemented.');
}

