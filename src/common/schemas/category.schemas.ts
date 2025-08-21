import { z } from 'zod';

// Category validation schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').optional(),
});

// Parameter validation schemas
export const categoryIdParamSchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
});

// Type exports for TypeScript
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;