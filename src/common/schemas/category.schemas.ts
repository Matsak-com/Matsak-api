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

// Category validation schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  translations: translationsSchema.optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  status: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').optional(),
  description: z.string().optional(),
  translations: translationsSchema.optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  status: z.boolean().optional(),
});

// Parameter validation schemas
export const categoryIdParamSchema = z.object({
  id: objectIdSchema,
});

// Type exports for TypeScript
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
