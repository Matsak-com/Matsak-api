import { z } from 'zod';

// Common MongoDB ObjectId validation
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

// Common parameter schemas
export const idParamSchema = z.object({
  id: objectIdSchema,
});

// Common query schemas
export const paginationQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
});

// File validation schema (for multipart uploads)
export const fileSchema = z.object({
  size: z.number(),
  buffer: z.instanceof(Buffer),
  originalname: z.string(),
  mimetype: z.string(),
});

// Type exports
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type FileValidation = z.infer<typeof fileSchema>;