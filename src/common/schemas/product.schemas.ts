import { z } from 'zod';

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
  expirationDate: z.string().datetime().optional(),
  manufacturer: z.string().optional(),
  isRepackaged: z.boolean().optional(),
});

// Image product schema
export const createImageProductSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  altText: z.string().optional(),
});

export const updateImageProductSchema = createImageProductSchema.partial();

// Product validation schemas
export const createProductSchema = z.object({
  detailData: createDetailProductSchema,
  imageId: z.string().min(1, 'Image ID is required'),
  subcategoryId: z.string().min(1, 'Subcategory ID is required'),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  detailData: createDetailProductSchema.optional(),
  imageData: updateImageProductSchema.optional(),
  subcategoryId: z.string().min(1, 'Subcategory ID is required').optional(),
  isActive: z.boolean().optional(),
});

// Parameter validation schemas
export const productIdParamSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

export const updateSubcategoryParamSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  subcategoryId: z.string().min(1, 'Subcategory ID is required'),
});

// Type exports for TypeScript
export type CreateDetailProductDto = z.infer<typeof createDetailProductSchema>;
export type CreateImageProductDto = z.infer<typeof createImageProductSchema>;
export type UpdateImageProductDto = z.infer<typeof updateImageProductSchema>;
export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type UpdateSubcategoryParam = z.infer<typeof updateSubcategoryParamSchema>;