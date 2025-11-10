import { z } from 'zod';
import { objectIdSchema } from './common.schemas';

// Translation schema
const translationSchema = z.object({
  en: z.string().optional(),
  fr: z.string().optional(),
  ar: z.string().optional(),
  zh: z.string().optional(),
});

const translationsSchema = z.object({
  name: translationSchema.optional(),
  description: translationSchema.optional(),
});

// Sub-category validation schemas
export const createSubCategorySchema = z.object({
  name: z.string().min(1, 'Sub-category name is required').optional(),
  categoryId: objectIdSchema,
  parentId: objectIdSchema.optional(),
  description: z.string().optional(),
  translations: translationsSchema.optional(),
  // imageUrl is handled as file upload via multipart, not validated in Zod
  status: z.boolean().optional(),
});

export const updateSubCategorySchema = z.object({
  name: z.string().min(1, 'Sub-category name is required').optional(),
  categoryId: objectIdSchema.optional(),
  parentId: objectIdSchema.optional(),
  description: z.string().optional(),
  translations: translationsSchema.optional(),
  // imageUrl is handled as file upload via multipart, not validated in Zod
  status: z.boolean().optional(),
});

// Parameter validation schemas
export const subCategoryIdParamSchema = z.object({
  id: objectIdSchema,
});

export const categoryIdParamSchema = z.object({
  categoryId: objectIdSchema,
});

// Type exports for TypeScript
export type CreateSubCategoryDto = z.infer<typeof createSubCategorySchema>;
export type UpdateSubCategoryDto = z.infer<typeof updateSubCategorySchema>;
export type SubCategoryIdParam = z.infer<typeof subCategoryIdParamSchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
