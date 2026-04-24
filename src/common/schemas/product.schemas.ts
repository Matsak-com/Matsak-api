// 🔧 CORRECTIONS dans product.schemas.ts

import { z } from 'zod';
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
} from '../constants/pharmaceutical.constants';

// Discount schema
export const discountSchema = z.object({
  type: z.enum(['percentage', 'fixed', 'bulk']),
  value: z.number().min(0),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
  minQuantity: z.number().min(1).optional(),
});

// Pricing schemas
export const setPriceSchema = z.object({
  basePrice: z.number().min(0),
  currency: z.string().default('MGA'),
});

export const addDiscountSchema = discountSchema;

export const updateDiscountSchema = discountSchema.partial();

export const calculatePriceSchema = z.object({
  quantity: z.number().min(1).default(1),
  calculateAt: z.date().optional(),
});

// SEO subdocument schema
export const seoSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  keywords: z.string().optional().default(''),
});

// Dimensions subdocument schema
export const dimensionsSchema = z.object({
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  unit: z.string().optional().default('cm'),
});

// Active ingredient subdocument schema
export const activeIngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0).optional(),
  unit: z.string().optional(),
});

// Storage conditions subdocument schema
export const storageConditionsSchema = z.object({
  minTemperature: z.number().nullable().optional(),
  maxTemperature: z.number().nullable().optional(),
  lightCondition: z
    .nativeEnum(StorageConditionLight)
    .optional()
    .default(StorageConditionLight.NO_RESTRICTION),
  moistureCondition: z
    .nativeEnum(StorageConditionMoisture)
    .optional()
    .default(StorageConditionMoisture.NO_RESTRICTION),
  specialInstructions: z.string().optional(),
});

// 🔧 NEW: Advanced data schema
export const advanceDataSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  weight: z.number().min(0).nullable().optional(),
  dimensions: dimensionsSchema.nullable().optional(),
  seo: seoSchema.optional(),
  additionalInfo: z.string().optional(),
});

// Detail product schema
export const createDetailProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional().default(''),

  // ------------------------------------------------------------------
  // Core pharmaceutical identifiers
  // ------------------------------------------------------------------
  genericName: z.string().optional(),
  atcCode: z.string().optional(),
  registrationNumber: z.string().optional(),
  countryOfOrigin: z.string().optional(),

  // ------------------------------------------------------------------
  // Pharmaceutical form & strength
  // ------------------------------------------------------------------
  dosageForm: z.nativeEnum(DosageForm).optional(),
  /** @deprecated Use dosageForm */
  form: z.string().optional(),
  strength: z.string().optional(),
  activeIngredients: z.array(activeIngredientSchema).optional().default([]),

  // ------------------------------------------------------------------
  // Route & administration
  // ------------------------------------------------------------------
  routeOfAdministration: z.nativeEnum(RouteOfAdministration).optional(),
  dosageInstructions: z.string().optional(),

  // ------------------------------------------------------------------
  // Therapeutic & pharmacological classification
  // ------------------------------------------------------------------
  therapeuticClass: z.nativeEnum(TherapeuticClass).optional(),
  pharmacologicalClass: z.nativeEnum(PharmacologicalClass).optional(),

  // ------------------------------------------------------------------
  // Clinical information
  // ------------------------------------------------------------------
  contraindications: z.string().optional(),
  sideEffects: z.string().optional(),
  warningLabels: z.array(z.string()).optional().default([]),
  drugInteractions: z.array(z.string()).optional().default([]),
  pregnancyCategory: z
    .nativeEnum(PregnancyCategory)
    .optional()
    .default(PregnancyCategory.NA),

  // ------------------------------------------------------------------
  // Regulatory & supply classification
  // ------------------------------------------------------------------
  prescriptionRequired: z.boolean().optional().default(false),
  controlledSubstance: z.boolean().optional().default(false),
  controlledSubstanceSchedule: z
    .nativeEnum(ControlledSubstanceSchedule)
    .optional(),
  isNarcotic: z.boolean().optional().default(false),

  // ------------------------------------------------------------------
  // Packaging & storage
  // ------------------------------------------------------------------
  packagingType: z.nativeEnum(PackagingType).optional(),
  packagingSize: z.string().optional(),
  storageConditions: storageConditionsSchema.optional(),

  // ------------------------------------------------------------------
  // Batch & expiry tracking
  // ------------------------------------------------------------------
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expirationDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === 'string') {
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : date;
      }
      return val;
    }),

  // ------------------------------------------------------------------
  // Manufacturer
  // ------------------------------------------------------------------
  manufacturer: z.string().optional(),
  isRepackaged: z.boolean().optional(),

  // ------------------------------------------------------------------
  // Category references
  // ------------------------------------------------------------------
  categoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for categoryId')
    .optional(),
  subcategoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for subcategoryId')
    .optional(),

  // ------------------------------------------------------------------
  // Identifiers & advanced data
  // ------------------------------------------------------------------
  sku: z.string().optional(),
  barcode: z.string().optional(),
  weight: z.number().min(0).nullable().optional(),
  dimensions: dimensionsSchema.nullable().optional(),
  seo: seoSchema.optional().default(() => ({})),
  additionalInfo: z.string().optional().default(''),
});

export const updateDetailProductSchema = createDetailProductSchema.partial();

// Image product schema
export const createImageProductSchema = z.object({
  filename: z.string().min(1, 'Filename is required').optional(),
});

export const updateImageProductSchema = createImageProductSchema.partial();

// 🔧 CORRECTION 1: Schéma pour les données d'image avec buffer (pour les uploads)
export const imageBufferSchema = z.object({
  buffer: z.instanceof(Buffer).optional(),
  originalname: z.string().optional(),
  mimetype: z.string().optional(),
});

// 🔧 CORRECTION 2: Schéma de produit plus flexible
export const createProductSchema = z.object({
  detailData: createDetailProductSchema,
  imageData: createImageProductSchema.optional(),
  teamId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for teamId')
    .min(1, 'Team ID is required'),
  basePrice: z.number().min(0, 'Base price must be positive').optional(),
  price: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      return val;
    })
    .optional(),
  currency: z.string().default('MGA'),
  discountType: z.string().optional(),
  discountValue: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      return val;
    })
    .optional(),
  productImage: z.union([z.string(), z.null()]).optional(),
  categoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for categoryId')
    .optional(),
  subcategoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for subcategoryId')
    .optional(),
  advanceData: advanceDataSchema.optional(),
  discounts: z.array(discountSchema).optional(),
  isActive: z.boolean().optional(),
});

// 🔧 CORRECTION 3: Schéma d'update plus permissif
export const updateProductSchema = z
  .object({
    detailData: updateDetailProductSchema.optional(),
    imageData: z
      .union([
        updateImageProductSchema,
        imageBufferSchema,
        z.string(), // Accepter aussi les strings pour les IDs d'images existantes
      ])
      .optional(),
    discounts: z.array(discountSchema).optional(),

    isActive: z.boolean().optional(),
  })
  // 🔧 SUPPRESSION de .strict() pour plus de flexibilité
  .refine(
    (data) => {
      // Au moins un champ doit être fourni pour la mise à jour
      return Object.keys(data).length > 0;
    },
    {
      message: 'At least one field must be provided for update',
    },
  );

// 🔧 CORRECTION 4: Schéma alternatif plus simple pour les updates partiels
export const simpleUpdateProductSchema = z.record(z.any()).refine(
  (data) => {
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  },
);

// Parameter validation schemas
export const productIdParamSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// subcategory is now part of DetailProduct; updating subcategory should be done via detail endpoints

export const updateProductSchemaFlexible = z
  .object({
    detailData: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),

        // Core pharmaceutical identifiers
        genericName: z.string().optional(),
        atcCode: z.string().optional(),
        registrationNumber: z.string().optional(),
        countryOfOrigin: z.string().optional(),

        // Pharmaceutical form & strength
        dosageForm: z.nativeEnum(DosageForm).optional(),
        /** @deprecated Use dosageForm */
        form: z.string().optional(),
        strength: z.string().optional(),
        activeIngredients: z.array(activeIngredientSchema).optional(),

        // Route & administration
        routeOfAdministration: z.nativeEnum(RouteOfAdministration).optional(),
        dosageInstructions: z.string().optional(),

        // Therapeutic & pharmacological classification
        therapeuticClass: z.nativeEnum(TherapeuticClass).optional(),
        pharmacologicalClass: z.nativeEnum(PharmacologicalClass).optional(),

        // Clinical information
        contraindications: z.string().optional(),
        sideEffects: z.string().optional(),
        warningLabels: z.array(z.string()).optional(),
        drugInteractions: z.array(z.string()).optional(),
        pregnancyCategory: z.nativeEnum(PregnancyCategory).optional(),

        // Regulatory & supply classification
        prescriptionRequired: z.boolean().optional(),
        controlledSubstance: z.boolean().optional(),
        controlledSubstanceSchedule: z
          .nativeEnum(ControlledSubstanceSchedule)
          .optional(),
        isNarcotic: z.boolean().optional(),

        // Packaging & storage
        packagingType: z.nativeEnum(PackagingType).optional(),
        packagingSize: z.string().optional(),
        storageConditions: storageConditionsSchema.optional(),

        // Batch & expiry tracking
        batchNumber: z.string().optional(),
        lotNumber: z.string().optional(),
        expirationDate: z
          .union([z.string(), z.date()])
          .optional()
          .transform((val) => {
            if (!val) return undefined;
            if (typeof val === 'string') {
              const date = new Date(val);
              return isNaN(date.getTime()) ? undefined : date;
            }
            return val;
          }),

        // Manufacturer
        manufacturer: z.string().optional(),
        isRepackaged: z.boolean().optional(),

        // Category references
        subcategoryId: z
          .string()
          .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for subcategoryId')
          .optional(),

        // Identifiers & advanced data
        sku: z.string().min(1, 'SKU must not be empty').optional(),
        barcode: z.string().optional(),
        weight: z.number().min(0, 'Weight must be positive').optional(),
        dimensions: dimensionsSchema.optional(),
        seo: seoSchema.optional(),
        additionalInfo: z.string().optional(),
      })
      .optional(),
    imageData: z.object({}).optional(),

    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return Object.keys(data).some((key) => data[key] !== undefined);
    },
    {
      message: 'At least one field must be provided for update',
    },
  );

export type UpdateProductDtoFlexible = z.infer<
  typeof updateProductSchemaFlexible
>;

export const simpleUpdateSchema = z
  .object({
    detailData: z
      .object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),

        // Core pharmaceutical identifiers
        genericName: z.string().optional(),
        atcCode: z.string().optional(),
        registrationNumber: z.string().optional(),
        countryOfOrigin: z.string().optional(),

        // Pharmaceutical form & strength
        dosageForm: z.nativeEnum(DosageForm).optional(),
        /** @deprecated Use dosageForm */
        form: z.string().optional(),
        strength: z.string().optional(),
        activeIngredients: z.array(activeIngredientSchema).optional(),

        // Route & administration
        routeOfAdministration: z.nativeEnum(RouteOfAdministration).optional(),
        dosageInstructions: z.string().optional(),

        // Therapeutic & pharmacological classification
        therapeuticClass: z.nativeEnum(TherapeuticClass).optional(),
        pharmacologicalClass: z.nativeEnum(PharmacologicalClass).optional(),

        // Clinical information
        contraindications: z.string().optional(),
        sideEffects: z.string().optional(),
        warningLabels: z.array(z.string()).optional(),
        drugInteractions: z.array(z.string()).optional(),
        pregnancyCategory: z.nativeEnum(PregnancyCategory).optional(),

        // Regulatory & supply classification
        prescriptionRequired: z.boolean().optional(),
        controlledSubstance: z.boolean().optional(),
        controlledSubstanceSchedule: z
          .nativeEnum(ControlledSubstanceSchedule)
          .optional(),
        isNarcotic: z.boolean().optional(),

        // Packaging & storage
        packagingType: z.nativeEnum(PackagingType).optional(),
        packagingSize: z.string().optional(),
        storageConditions: storageConditionsSchema.optional(),

        // Batch & expiry tracking
        batchNumber: z.string().optional(),
        lotNumber: z.string().optional(),
        expirationDate: z
          .union([z.string(), z.date()])
          .optional()
          .transform((val) => {
            if (!val) return undefined;
            if (typeof val === 'string') {
              const date = new Date(val);
              return isNaN(date.getTime()) ? undefined : date;
            }
            return val;
          }),

        // Manufacturer
        manufacturer: z.string().optional(),
        isRepackaged: z.boolean().optional(),

        // Category references
        categoryId: z
          .string()
          .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for categoryId')
          .optional(),
        subcategoryId: z
          .string()
          .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for subcategoryId')
          .optional(),

        // Identifiers & advanced data
        sku: z.string().optional(),
        barcode: z.string().optional(),
        weight: z.number().min(0).nullable().optional(),
        dimensions: dimensionsSchema.nullable().optional(),
        seo: seoSchema.optional(),
        additionalInfo: z.string().optional(),
      })
      .optional(),

    basePrice: z.number().min(0).optional(),
    price: z.number().min(0).optional(), // Added price field from payload
    discountType: z.string().optional(), // Added discountType field
    discountValue: z.number().min(0).optional(), // Added discountValue field
    currency: z.string().optional(),
    categoryId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for categoryId')
      .optional(),
    subcategoryId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for subcategoryId')
      .optional(),
    productImage: z.union([z.string(), z.null()]).optional(), // Allow null for productImage
    teamId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for teamId')
      .optional(),
    isActive: z.boolean().optional(),
    // Enhanced imageData to handle base64 data from productImage
    imageData: z
      .union([
        z.object({
          data: z.string().optional(), // base64 data
          name: z.string().optional(), // filename
          mimeType: z.string().optional(), // mime type
          url: z.string().optional(), // data URL
        }),
        z.null(), // Allow null for image removal
      ])
      .optional(),
    discounts: z.array(discountSchema).optional(),
    // 🔧 NEW: Advanced data support
    advanceData: advanceDataSchema.optional(),
  })
  .passthrough() // Allow additional fields to pass through without validation errors
  .refine(
    (data) => {
      return Object.keys(data).some((key) => data[key] !== undefined);
    },
    {
      message: 'At least one field must be provided for update',
    },
  );

// Créer un nouveau type pour éviter les conflits
export type SimpleUpdateDto = z.infer<typeof simpleUpdateSchema>;

// Types TypeScript
export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type CreateDetailProductDto = z.infer<typeof createDetailProductSchema>;
export type UpdateDetailProductDto = z.infer<typeof updateDetailProductSchema>;
export type CreateImageProductDto = z.infer<typeof createImageProductSchema>;
export type UpdateImageProductDto = z.infer<typeof updateImageProductSchema>;

// 🔧 NOUVEAU: Type pour les données d'image avec buffer
export type ImageBufferDto = z.infer<typeof imageBufferSchema>;

// 🔧 NEW: Type for advanced data
export type AdvanceDataDto = z.infer<typeof advanceDataSchema>;
