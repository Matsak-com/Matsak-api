import { z } from 'zod';

const coordinatesSchema = z.preprocess(
  (arg) => {
    if (typeof arg === 'string') {
      try {
        return JSON.parse(arg);
      } catch {
        return arg;
      }
    }
    return arg;
  },
  z.object({
    lat: z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    lng: z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  }),
);

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  address: z.string().optional(),
  additional_address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  region: z.string().optional(),
  timezone: z.string().optional(),
  countryCode: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
  logoUrl: z.any().optional(), // File upload handled by multer
  language: z.string().min(1, 'Language is required'),
});

export const updateTeamSchema = createTeamSchema.partial();

// Parameter validation schemas
export const teamIdParamSchema = z.object({
  id: z.string().min(1, 'Team ID is required'),
});

// Type exports for TypeScript
export type CreateTeamDto = z.infer<typeof createTeamSchema>;
export type UpdateTeamDto = z.infer<typeof updateTeamSchema>;
export type TeamIdParam = z.infer<typeof teamIdParamSchema>;
