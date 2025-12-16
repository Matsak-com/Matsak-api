import { z } from 'zod';
import { objectIdSchema } from './common.schemas';

// User creation schema for members
const createUserForMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  firstname: z.string().min(1, 'First name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

// Member validation schemas
export const createMemberSchema = z
  .object({
    user: createUserForMemberSchema.optional(),
    userId: objectIdSchema.optional(),
    role: objectIdSchema,
    teams: z.array(objectIdSchema).min(1, 'At least one team is required'),
    status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
    permissions: z.array(z.string()).optional(),
    notes: z.string().optional(),
    joinedAt: z.string().datetime().optional(),
    invitedBy: objectIdSchema.optional(),
  })
  .refine((data) => data.user || data.userId, {
    message: "Either 'user' information or 'userId' must be provided",
    path: ['user', 'userId'],
  });

export const updateMemberSchema = z.object({
  role: objectIdSchema.optional(),
  userId: objectIdSchema.optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  permissions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  lastActiveAt: z.string().datetime().optional(),
});

// Parameter validation schemas
export const memberIdParamSchema = z.object({
  id: objectIdSchema,
});

// Type exports for TypeScript
export type CreateMemberDto = z.infer<typeof createMemberSchema>;
export type UpdateMemberDto = z.infer<typeof updateMemberSchema>;
export type MemberIdParam = z.infer<typeof memberIdParamSchema>;
