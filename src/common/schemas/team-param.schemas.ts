import { z } from 'zod';

// Base team param validation schema
const baseTeamParamSchema = z.object({
  team: z.string().min(1, 'Team ID is required'),
  name: z.string().min(1, 'Parameter name is required'),
});

// Show Number Parameter schema
export const createShowNumberParamSchema = baseTeamParamSchema.extend({
  paramType: z.literal('ShowNumberParam'),
  value: z.boolean(),
});

// Show Email Parameter schema
export const createShowEmailParamSchema = baseTeamParamSchema.extend({
  paramType: z.literal('ShowEmailParam'),
  value: z.boolean(),
});

// Currency Parameter schema
export const createCurrencyParamSchema = baseTeamParamSchema.extend({
  paramType: z.literal('CurrencyParam'),
  value: z.enum([
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'CAD',
    'AUD',
    'CHF',
    'CNY',
    'MGA',
    'XOF',
  ]),
});

// Openings Parameter schema
export const createOpeningsParamSchema = baseTeamParamSchema.extend({
  paramType: z.literal('OpeningsParam'),
  value: z.object({
    dayOfWeek: z.enum([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]),
    openingHour: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Opening hour must be in HH:MM format',
    }),
    closingHour: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Closing hour must be in HH:MM format',
    }),
  }),
});

// Union schema for creating any team param
export const createTeamParamSchema = z.discriminatedUnion('paramType', [
  createShowNumberParamSchema,
  createShowEmailParamSchema,
  createCurrencyParamSchema,
  createOpeningsParamSchema,
]);

// Update schemas (partial)
export const updateShowNumberParamSchema = createShowNumberParamSchema
  .partial()
  .omit({ paramType: true });
export const updateShowEmailParamSchema = createShowEmailParamSchema
  .partial()
  .omit({ paramType: true });
export const updateCurrencyParamSchema = createCurrencyParamSchema
  .partial()
  .omit({ paramType: true });
export const updateOpeningsParamSchema = createOpeningsParamSchema
  .partial()
  .omit({ paramType: true });

export const updateTeamParamSchema = z.union([
  updateShowNumberParamSchema,
  updateShowEmailParamSchema,
  updateCurrencyParamSchema,
  updateOpeningsParamSchema,
]);

// Parameter validation schemas
export const teamParamIdParamSchema = z.object({
  id: z.string().min(1, 'Team param ID is required'),
});

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

// Query schemas
export const teamParamQuerySchema = z.object({
  team: z.string().optional(),
  paramType: z
    .enum([
      'ShowNumberParam',
      'ShowEmailParam',
      'CurrencyParam',
      'OpeningsParam',
    ])
    .optional(),
  name: z.string().optional(),
});

// Type exports for TypeScript
export type CreateTeamParamDto = z.infer<typeof createTeamParamSchema>;
export type CreateShowNumberParamDto = z.infer<
  typeof createShowNumberParamSchema
>;
export type CreateShowEmailParamDto = z.infer<
  typeof createShowEmailParamSchema
>;
export type CreateCurrencyParamDto = z.infer<typeof createCurrencyParamSchema>;
export type CreateOpeningsParamDto = z.infer<typeof createOpeningsParamSchema>;

export type UpdateTeamParamDto = z.infer<typeof updateTeamParamSchema>;
export type UpdateShowNumberParamDto = z.infer<
  typeof updateShowNumberParamSchema
>;
export type UpdateShowEmailParamDto = z.infer<
  typeof updateShowEmailParamSchema
>;
export type UpdateCurrencyParamDto = z.infer<typeof updateCurrencyParamSchema>;
export type UpdateOpeningsParamDto = z.infer<typeof updateOpeningsParamSchema>;

export type TeamParamIdParam = z.infer<typeof teamParamIdParamSchema>;
export type TeamIdParam = z.infer<typeof teamIdParamSchema>;
export type TeamParamQuery = z.infer<typeof teamParamQuerySchema>;
