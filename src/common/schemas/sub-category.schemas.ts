import { z } from 'zod';
import { objectIdSchema } from './common.schemas';

// Sub-category validation schemas
export const createSubCategorySchema = z.object({
  name: z.string().min(1, 'Sub-category name is required'),
  categoryId: objectIdSchema,
});

export const updateSubCategorySchema = z.object({
  name: z.string().min(1, 'Sub-category name is required').optional(),
  categoryId: objectIdSchema.optional(),
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
