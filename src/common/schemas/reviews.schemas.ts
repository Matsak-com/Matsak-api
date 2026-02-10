import { z } from 'zod';

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
});
