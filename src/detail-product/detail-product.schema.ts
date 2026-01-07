import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from '../categories/category.schema';
import { SubCategory } from 'src/sub-categories/sub-category.schema';

export type DetailProductDocument = DetailProduct & Document;

// SEO subdocument schema
@Schema({ _id: false })
export class SEO {
  @Prop({ required: false, default: '' })
  title: string;

  @Prop({ required: false, default: '' })
  description: string;

  @Prop({ required: false, default: '' })
  keywords: string;
}

// Dimensions subdocument schema
@Schema({ _id: false })
export class Dimensions {
  @Prop({ required: false })
  length?: number;

  @Prop({ required: false })
  width?: number;

  @Prop({ required: false })
  height?: number;

  @Prop({ required: false, default: 'cm' })
  unit?: string;
}

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

  // New properties added from the request
  @Prop({ required: false, unique: true, sparse: true })
  sku?: string;

  @Prop({ required: false, unique: true, sparse: true })
  barcode?: string;

  @Prop({ required: false, min: 0 })
  weight?: number; // in grams

  @Prop({ type: Dimensions, required: false })
  dimensions?: Dimensions;

  @Prop({ type: SEO, required: false, default: () => ({}) })
  seo: SEO;

  @Prop({ required: false, default: '' })
  additionalInfo?: string;

  // Category reference (required)
  @Prop({
    type: Types.ObjectId,
    ref: Category.name,
    required: true,
    index: true,
  })
  category: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
  })
  // SubCategory reference (optional - more specific categorization)
  @Prop({
    type: Types.ObjectId,
    ref: SubCategory.name,
    required: false,
    index: true,
  })
  subcategory?: Types.ObjectId;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const SEOSchema = SchemaFactory.createForClass(SEO);
export const DimensionsSchema = SchemaFactory.createForClass(Dimensions);
export const DetailProductSchema = SchemaFactory.createForClass(DetailProduct);

DetailProductSchema.index({ category: 1, subcategory: 1 });

DetailProductSchema.index({ sku: 1, barcode: 1 });

DetailProductSchema.pre('save', async function () {
  if (this.subcategory && this.category) {
    try {
      const SubCategoryModel = this.db.model('SubCategory');
      const subcategory = await SubCategoryModel.findById(this.subcategory);

      if (subcategory && subcategory.categoryId) {
        if (!subcategory.categoryId.equals(this.category)) {
          throw new Error('Subcategory must belong to the specified category');
        }
      } else if (subcategory && !subcategory.categoryId) {
        throw new Error('Subcategory does not have a valid category reference');
      } else if (!subcategory) {
        throw new Error('Subcategory not found');
      }
    } catch (error) {
      console.error('Pre-save validation error:', error);
      throw error;
    }
  }
});
