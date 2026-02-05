import { z } from 'zod';
import { objectIdSchema } from './common.schemas';

// User Role enum
export const UserRoleEnum = z.enum(['user', 'admin']);

// Supported locales
export const LocaleEnum = z.enum(['en', 'fr', 'zh', 'ar']);

// Base user validation schemas
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  firstname: z.string().min(1, 'First name is required'),
  email: z.string().email('You must provide a valid email address.'),
  password: z
    .string()
    .min(8, 'Your password must be more than 8 characters long.'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // optional field
        // Allow only typical phone characters
        if (!/^[+\d\s().-]+$/.test(val)) return false;
        // Enforce a reasonable number of digits (e.g., 7 to 15)
        const digitCount = val.replace(/\D/g, '').length;
        return digitCount >= 7 && digitCount <= 15;
      },
      {
        message: 'Invalid phone number format',
      },
    ),
  role: UserRoleEnum.default('user'),
  locale: LocaleEnum.default('fr'),
  isResettingPassword: z.boolean().optional(),
  resetPasswordToken: z.string().nullable().optional(),
  avatarFileKey: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
});

// Update locale validation schema
export const updateLocaleSchema = z.object({
  locale: z.enum(['en', 'fr', 'zh', 'ar'], {
    errorMap: () => ({ message: 'Locale must be one of: en, fr, zh, ar' }),
  }),
});

export const loginUserSchema = z.object({
  email: z.string().email('You must provide a valid email address.'),
  password: z
    .string()
    .min(8, 'Your password must be more than 8 characters long.'),
  provider: z.string().optional(), // Optional field for provider (e.g., 'facebook', 'google')
  accessToken: z.string().optional(), // Optional field for access token (e.g., from Facebook or Google)
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email('You must provide a valid email address.'),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Your password must be more than 8 characters long.'),
  token: z.string().min(1, 'Reset token is required'),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  firstname: z.string().optional(),
  email: z.string().email().optional(),
  locale: LocaleEnum.optional(), // ← Optionnel pour la mise à jour
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Your password must be more than 8 characters long.'),
});

export const googleCallbackSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

export const verifyResetTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Parameter validation schemas
export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// Query parameter validation schemas
export const tokenQuerySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Switch team validation schema
export const switchTeamSchema = z.object({
  teamId: objectIdSchema,
});

// Type exports for TypeScript
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type LoginUserDto = z.infer<typeof loginUserSchema>;
export type ResetPasswordRequestDto = z.infer<
  typeof resetPasswordRequestSchema
>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdatePasswordDto = z.infer<typeof updatePasswordSchema>;
export type GoogleCallbackDto = z.infer<typeof googleCallbackSchema>;
export type VerifyResetTokenDto = z.infer<typeof verifyResetTokenSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type TokenQuery = z.infer<typeof tokenQuerySchema>;
export type SwitchTeamDto = z.infer<typeof switchTeamSchema>;
export type UpdateLocaleDto = z.infer<typeof updateLocaleSchema>;
