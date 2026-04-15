import { z } from 'zod';

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const MAX_ITEM_QUANTITY = 99;

const mongoIdSchema = z
  .string()
  .regex(MONGO_ID_REGEX, 'Invalid product ID format');

const quantitySchema = z
  .number()
  .int()
  .min(1, 'Quantity must be at least 1')
  .max(MAX_ITEM_QUANTITY, `Quantity cannot exceed ${MAX_ITEM_QUANTITY}`);

// Cart validation schemas
export const addToCartSchema = z.object({
  productId: mongoIdSchema,
  quantity: quantitySchema.optional().default(1),
});

export const updateCartQuantitySchema = z.object({
  quantity: quantitySchema,
});

// Query parameter validation schemas
export const productIdQuerySchema = z.object({
  productId: mongoIdSchema,
});

export { MAX_ITEM_QUANTITY };

// Type exports for TypeScript
export type AddToCartDto = z.infer<typeof addToCartSchema>;
export type UpdateCartQuantityDto = z.infer<typeof updateCartQuantitySchema>;
export type ProductIdQuery = z.infer<typeof productIdQuerySchema>;
