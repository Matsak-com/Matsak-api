import { z } from 'zod';

// Cart validation schemas
export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int()
    .min(1, 'Quantity must be at least 1')
    .optional()
    .default(1),
});

export const updateCartQuantitySchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

// Query parameter validation schemas
export const productIdQuerySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

// Type exports for TypeScript
export type AddToCartDto = z.infer<typeof addToCartSchema>;
export type UpdateCartQuantityDto = z.infer<typeof updateCartQuantitySchema>;
export type ProductIdQuery = z.infer<typeof productIdQuerySchema>;
