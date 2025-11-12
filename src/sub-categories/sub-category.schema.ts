import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubCategoryDocument = SubCategory & Document;

// Translation interface for subcategory names and descriptions
export interface SubCategoryTranslation {
  en?: string;
  fr?: string;
  ar?: string;
  zh?: string;
}

@Schema({ timestamps: true })
export class SubCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'SubCategory',
    default: null,
    index: true,
  })
  parentId: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SubCategory' }], default: [] })
  children: Types.ObjectId[];

  @Prop({ default: 0 })
  level: number;

  @Prop({ type: [Types.ObjectId], default: [] })
  ancestors: Types.ObjectId[];

  @Prop()
  description: string;

  @Prop({ type: Object })
  translations?: {
    name?: SubCategoryTranslation;
    description?: SubCategoryTranslation;
  };

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  status: boolean;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);

// Index for efficient tree queries
SubCategorySchema.index({ categoryId: 1, parentId: 1 });
SubCategorySchema.index({ categoryId: 1, level: 1 });
SubCategorySchema.index({ ancestors: 1 });
