import { z } from 'zod';
import { objectIdSchema } from './common.schemas';

// Member validation schemas
export const createMemberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  email: z.string().email('Valid email is required'),
  role: objectIdSchema.optional(),
  teamId: objectIdSchema.optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

// Parameter validation schemas
export const memberIdParamSchema = z.object({
  id: objectIdSchema,
});

// Type exports for TypeScript
export type CreateMemberDto = z.infer<typeof createMemberSchema>;
export type UpdateMemberDto = z.infer<typeof updateMemberSchema>;
export type MemberIdParam = z.infer<typeof memberIdParamSchema>;