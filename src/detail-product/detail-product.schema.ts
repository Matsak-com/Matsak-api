// detail-product.schema.ts
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
  isRepackaged: boolean; // true si déconditionné, false sinon

  // Category reference (required)
  @Prop({ 
    type: Types.ObjectId, 
    ref: Category.name,
    required: true,
    index: true 
  })
  category: Types.ObjectId;

  // SubCategory reference (optional - more specific categorization)
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

// Add compound index for efficient category/subcategory queries
DetailProductSchema.index({ category: 1, subcategory: 1 });

// Add validation to ensure subcategory belongs to the specified category
DetailProductSchema.pre('save', async function() {
  if (this.subcategory && this.category) {
    const SubCategoryModel = this.db.model('SubCategory');
    const subcategory = await SubCategoryModel.findById(this.subcategory);
    
    if (subcategory && !subcategory.categoryId.equals(this.category)) {
      throw new Error('Subcategory must belong to the specified category');
    }
  }
});
