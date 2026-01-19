import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

// 1. BASE SCHEMAS

// Helper to get the appropriate validation schema based on setting
export const getSettingValueSchema = (setting: string) => {
  switch (setting) {
    case 'theme':
      return themeEnum;
    case 'sidebarLayout':
    case 'rtlLayout':
    case 'boxedLayout':
    case 'miniSidebar':
    case 'borderCard':
      return z.boolean();
    default:
      throw new BadRequestException('Invalid setting parameter');
  }
};

// Available themes
export const themeEnum = z.enum([
  'BLUE_THEME',
  'AQUA_THEME',
  'PURPLE_THEME',
  'GREEN_THEME',
  'CYAN_THEME',
  'ORANGE_THEME',
  'DARK_BLUE_THEME',
  'DARK_AQUA_THEME',
  'DARK_PURPLE_THEME',
  'DARK_GREEN_THEME',
  'DARK_CYAN_THEME',
  'DARK_ORANGE_THEME',
]);

// 2. MAIN SETTINGS SCHEMA

export const preferenceSettingsSchema = z
  .object({
    // Current theme
    theme: themeEnum.default('BLUE_THEME'),

    // Sidebar layout: false = Vertical, true = Horizontal
    sidebarLayout: z.boolean().default(false),

    // Direction: false = LTR, true = RTL
    rtlLayout: z.boolean().default(false),

    // Container option: true = Boxed, false = Full
    boxedLayout: z.boolean().default(false),

    // Sidebar type: false = Full, true = Collapsed
    // Note: miniSidebar is only available if sidebarLayout = false (Vertical)
    miniSidebar: z.boolean().default(false),

    // Card style: false = Shadow, true = Border
    borderCard: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Validation: miniSidebar can only be true if sidebarLayout is false (Vertical)
      if (data.miniSidebar && data.sidebarLayout) {
        return false;
      }
      return true;
    },
    {
      message:
        'miniSidebar can only be enabled when sidebarLayout is false (Vertical mode)',
      path: ['miniSidebar'],
    },
  );

// 3. CREATE/UPDATE SCHEMAS

// For creation (all fields optional)
export const createPreferenceSchema = z
  .object({
    settings: preferenceSettingsSchema.optional(),
  })
  .transform((data) => ({
    // Ensure settings exists with default values
    settings: data.settings || preferenceSettingsSchema.parse({}),
  }));

// Specific schema for updates (without validation - will be validated after merge)
export const updatePreferenceSettingsSchema = z
  .object({
    theme: themeEnum.optional(),
    sidebarLayout: z.boolean().optional(),
    rtlLayout: z.boolean().optional(),
    boxedLayout: z.boolean().optional(),
    miniSidebar: z.boolean().optional(),
    borderCard: z.boolean().optional(),
  })
  .refine(
    (settings) => {
      // At least one field must be provided for update
      return Object.keys(settings).length > 0;
    },
    {
      message: 'At least one parameter must be provided for update',
      path: ['settings'],
    },
  );

export const updatePreferenceSchema = z.object({
  settings: updatePreferenceSettingsSchema,
});

// Helper function to validate merged settings
// This should be called in your service after merging current + update
export const validateMergedSettings = (mergedSettings: any) => {
  try {
    return preferenceSettingsSchema.parse(mergedSettings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestException(
        error.errors.map((e) => e.message).join(', '),
      );
    }
    throw error;
  }
};

// For updating a specific setting
export const updateSpecificSettingSchema = z.object({
  value: z.union([z.string(), z.boolean()]),
});

// 4. PARAMETER SCHEMAS

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// 5. TYPESCRIPT TYPES

export type Theme = z.infer<typeof themeEnum>;
export type PreferenceSettings = z.infer<typeof preferenceSettingsSchema>;
export type UpdatePreferenceSettings = z.infer<
  typeof updatePreferenceSettingsSchema
>;
export type CreatePreferenceDto = z.infer<typeof createPreferenceSchema>;
export type UpdatePreferenceDto = z.infer<typeof updatePreferenceSchema>;
export type UpdateSpecificSettingDto = z.infer<
  typeof updateSpecificSettingSchema
>;