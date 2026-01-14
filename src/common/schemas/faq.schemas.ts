import { z } from 'zod';
import { objectIdSchema } from './common.schemas';

const translationSchema = z.object({
  fr: z.string().max(500).optional(),
  en: z.string().max(500).optional(),
  ar: z.string().max(500).optional(),
  zh: z.string().max(500).optional(),
});

const nonEmptyTranslationSchema = translationSchema.refine(
  (val) => Object.values(val).some((v) => !!v && v.trim() !== ''),
  'At least one locale (fr, en, ar, zh) is required',
);

export const createFaqSchema = z.object({
  question: nonEmptyTranslationSchema,
  answer: nonEmptyTranslationSchema,
  category: z.string().max(120).optional(),
  tags: z.array(z.string().max(120)).optional(),
  isPublished: z.boolean().optional(),
  order: z.number().optional(),
});

export const updateFaqSchema = z.object({
  question: nonEmptyTranslationSchema.optional(),
  answer: nonEmptyTranslationSchema.optional(),
  category: z.string().max(120).optional(),
  tags: z.array(z.string().max(120)).optional(),
  isPublished: z.boolean().optional(),
  order: z.number().optional(),
});

export const faqIdParamSchema = z.object({
  id: objectIdSchema,
});

export const faqListQuerySchema = z.object({
  category: z.string().max(120).optional(),
  search: z.string().max(500).optional(),
  includeUnpublished: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
});

export type CreateFaqDtoZ = z.infer<typeof createFaqSchema>;
export type UpdateFaqDtoZ = z.infer<typeof updateFaqSchema>;
export type FaqIdParam = z.infer<typeof faqIdParamSchema>;
export type FaqListQuery = z.infer<typeof faqListQuerySchema>;
