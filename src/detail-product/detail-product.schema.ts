import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from '../categories/category.schema';
import { SubCategory } from '../sub-categories/sub-category.schema';
import {
  DosageForm,
  RouteOfAdministration,
  TherapeuticClass,
  PharmacologicalClass,
  PregnancyCategory,
  ControlledSubstanceSchedule,
  PackagingType,
  StorageConditionLight,
  StorageConditionMoisture,
} from '../common/constants/pharmaceutical.constants';

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

// Active ingredient subdocument schema
@Schema({ _id: false })
export class ActiveIngredient {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false, min: 0 })
  amount?: number;

  @Prop({ required: false })
  unit?: string;
}

// Storage conditions subdocument schema
@Schema({ _id: false })
export class StorageConditions {
  @Prop({ required: false })
  minTemperature?: number;

  @Prop({ required: false })
  maxTemperature?: number;

  @Prop({
    required: false,
    enum: Object.values(StorageConditionLight),
    default: StorageConditionLight.NO_RESTRICTION,
  })
  lightCondition: StorageConditionLight;

  @Prop({
    required: false,
    enum: Object.values(StorageConditionMoisture),
    default: StorageConditionMoisture.NO_RESTRICTION,
  })
  moistureCondition: StorageConditionMoisture;

  @Prop({ required: false })
  specialInstructions?: string;
}

@Schema({ timestamps: true })
export class DetailProduct {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false, default: '' })
  description: string;

  // ------------------------------------------------------------------
  // Core pharmaceutical identifiers
  // ------------------------------------------------------------------
  @Prop({ required: false })
  genericName?: string;

  /** Anatomical Therapeutic Chemical classification code */
  @Prop({ required: false, index: true })
  atcCode?: string;

  @Prop({ required: false })
  registrationNumber?: string;

  @Prop({ required: false })
  countryOfOrigin?: string;

  // ------------------------------------------------------------------
  // Pharmaceutical form & strength
  // ------------------------------------------------------------------
  @Prop({
    required: false,
    enum: Object.values(DosageForm),
  })
  dosageForm?: DosageForm;

  /** @deprecated Use dosageForm */
  @Prop({ required: false })
  form?: string;

  @Prop({ required: false })
  strength?: string;

  @Prop({ type: [ActiveIngredient], default: [] })
  activeIngredients: ActiveIngredient[];

  // ------------------------------------------------------------------
  // Route & administration
  // ------------------------------------------------------------------
  @Prop({
    required: false,
    enum: Object.values(RouteOfAdministration),
  })
  routeOfAdministration?: RouteOfAdministration;

  @Prop({ required: false })
  dosageInstructions?: string;

  // ------------------------------------------------------------------
  // Therapeutic & pharmacological classification
  // ------------------------------------------------------------------
  @Prop({
    required: false,
    enum: Object.values(TherapeuticClass),
    index: true,
  })
  therapeuticClass?: TherapeuticClass;

  @Prop({
    required: false,
    enum: Object.values(PharmacologicalClass),
    index: true,
  })
  pharmacologicalClass?: PharmacologicalClass;

  // ------------------------------------------------------------------
  // Clinical information
  // ------------------------------------------------------------------
  @Prop({ required: false })
  contraindications?: string;

  @Prop({ required: false })
  sideEffects?: string;

  @Prop({ type: [String], default: [] })
  warningLabels: string[];

  @Prop({ type: [String], default: [] })
  drugInteractions: string[];

  @Prop({
    required: false,
    enum: Object.values(PregnancyCategory),
    default: PregnancyCategory.NA,
  })
  pregnancyCategory: PregnancyCategory;

  // ------------------------------------------------------------------
  // Regulatory & supply classification
  // ------------------------------------------------------------------
  @Prop({ required: false, default: false })
  prescriptionRequired: boolean;

  @Prop({ required: false, default: false })
  controlledSubstance: boolean;

  @Prop({
    required: false,
    enum: Object.values(ControlledSubstanceSchedule),
  })
  controlledSubstanceSchedule?: ControlledSubstanceSchedule;

  @Prop({ required: false, default: false })
  isNarcotic: boolean;

  // ------------------------------------------------------------------
  // Packaging & storage
  // ------------------------------------------------------------------
  @Prop({
    required: false,
    enum: Object.values(PackagingType),
  })
  packagingType?: PackagingType;

  @Prop({ required: false })
  packagingSize?: string;

  @Prop({ type: StorageConditions, required: false })
  storageConditions?: StorageConditions;

  // ------------------------------------------------------------------
  // Batch & expiry tracking
  // ------------------------------------------------------------------
  @Prop({ required: false })
  batchNumber?: string;

  @Prop({ required: false })
  lotNumber?: string;

  @Prop({ required: false })
  expirationDate?: Date;

  // ------------------------------------------------------------------
  // Manufacturer
  // ------------------------------------------------------------------
  @Prop({ required: false })
  manufacturer?: string;

  @Prop({ required: false, default: false })
  isRepackaged: boolean;

  // ------------------------------------------------------------------
  // Identifiers & advanced data
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Category references
  // ------------------------------------------------------------------
  @Prop({
    type: Types.ObjectId,
    ref: Category.name,
    required: true,
    index: true,
  })
  category: Types.ObjectId;

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
export const ActiveIngredientSchema =
  SchemaFactory.createForClass(ActiveIngredient);
export const StorageConditionsSchema =
  SchemaFactory.createForClass(StorageConditions);
export const DetailProductSchema = SchemaFactory.createForClass(DetailProduct);

DetailProductSchema.index({ category: 1, subcategory: 1 });
DetailProductSchema.index({ therapeuticClass: 1 });
DetailProductSchema.index({ pharmacologicalClass: 1 });
DetailProductSchema.index({ atcCode: 1 });
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
