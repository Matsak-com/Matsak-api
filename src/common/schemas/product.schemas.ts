// 🔧 CORRECTIONS dans product.schemas.ts

import { z } from 'zod';

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

// Detail product schema
export const createDetailProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().min(1, 'Product description is required'),
  composition: z.string().optional(),
  form: z.string().optional(),
  indications: z.string().optional(),
  contraindications: z.string().optional(),
  sideEffects: z.string().optional(),
  precautions: z.string().optional(),
  expirationDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Invalid datetime',
    }),
  manufacturer: z.string().optional(),
  isRepackaged: z.boolean().optional(),
});

export const updateDetailProductSchema = createDetailProductSchema.partial();

// Image product schema
export const createImageProductSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  altText: z.string().optional(),
});

export const updateImageProductSchema = createImageProductSchema.partial();

// 🔧 CORRECTION 1: Schéma pour les données d'image avec buffer (pour les uploads)
export const imageBufferSchema = z.object({
  buffer: z.instanceof(Buffer).optional(),
  originalname: z.string().optional(),
  mimetype: z.string().optional(),
  altText: z.string().optional(),
});

// 🔧 CORRECTION 2: Schéma de produit plus flexible
export const createProductSchema = z.object({
  detailData: createDetailProductSchema,
  imageData: createImageProductSchema.optional(),
  subcategoryId: z.string().min(1, 'Subcategory ID is required'),
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
    subcategoryId: z.string().min(1, 'Subcategory ID is required').optional(),
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

export const updateSubcategoryParamSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  subcategoryId: z.string().min(1, 'Subcategory ID is required'),
});

export const updateProductSchemaFlexible = z
  .object({
    detailData: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        composition: z.string().optional(),
        form: z.string().optional(),
        indications: z.string().optional(),
        contraindications: z.string().optional(),
        sideEffects: z.string().optional(),
        precautions: z.string().optional(),
        expirationDate: z.date().optional(), // 🔧 Accepter directement Date
        manufacturer: z.string().optional(),
        isRepackaged: z.boolean().optional(),
      })
      .optional(),
    imageData: z
      .object({
        altText: z.string().optional(),
      })
      .optional(),
    subcategoryId: z.string().optional(),
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
        description: z.string().min(1).optional(),
        composition: z.string().optional(),
        form: z.string().optional(),
        indications: z.string().optional(),
        contraindications: z.string().optional(),
        sideEffects: z.string().optional(),
        precautions: z.string().optional(),
        expirationDate: z.date().optional(),
        manufacturer: z.string().optional(),
        isRepackaged: z.boolean().optional(),
      })
      .optional(),
    subcategoryId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
      .optional(),
    isActive: z.boolean().optional(),
    // 🔧 CORRECTION: imageData plus flexible
    imageData: z
      .object({
        altText: z.string().optional(),
      })
      .optional(),
  })
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
