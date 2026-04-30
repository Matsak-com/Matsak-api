import { z } from 'zod';
import { AuditAction, AuditStatus } from './audit-log.schema';

export const auditLogQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v >= 1, 'page must be >= 1'),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .refine((v) => v >= 1 && v <= 200, 'limit must be between 1 and 200'),
  actorId: z.string().optional(),
  actorRole: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  resource: z.string().optional(),
  status: z.nativeEnum(AuditStatus).optional(),
  teamId: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .refine(
      (v) => !v || !isNaN(Date.parse(v)),
      'startDate must be a valid ISO date',
    ),
  endDate: z
    .string()
    .optional()
    .refine(
      (v) => !v || !isNaN(Date.parse(v)),
      'endDate must be a valid ISO date',
    ),
});

export const auditLogIdParamSchema = z.object({
  id: z.string().min(1),
});

export const auditLogCleanupBodySchema = z.object({
  olderThanDays: z
    .number()
    .int()
    .min(30, 'Cannot delete logs newer than 30 days'),
});
