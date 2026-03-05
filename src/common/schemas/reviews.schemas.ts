import { z } from 'zod';
import { ReviewStatus } from '../../reviews/review.schema';

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

export const reviewIdParamSchema = z.object({
  id: z.string().min(1, 'Review ID is required'),
});

export const reviewQuerySchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
});

export const reviewStatusBodySchema = z.object({
  status: z.literal(ReviewStatus.REJECTED),
});
