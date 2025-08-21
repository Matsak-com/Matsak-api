import { z } from 'zod';

// Role validation schemas
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').optional(),
  description: z.string().optional(),
});

// Parameter validation schemas
export const roleIdParamSchema = z.object({
  id: z.string().min(1, 'Role ID is required'),
});

// Type exports for TypeScript
export type CreateRoleDto = z.infer<typeof createRoleSchema>;
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
export type RoleIdParam = z.infer<typeof roleIdParamSchema>;
