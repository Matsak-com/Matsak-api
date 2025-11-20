import { UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ZodSchema } from 'zod';
import { ZodMultipartInterceptor } from '../interceptors/zod-multipart.interceptor';

/**
 * Helper decorator to validate multipart/form-data with Zod after Multer runs for multiple files.
 * Usage: @ZodMultipartFiles(schema, 'fileField', maxCount)
 */
export const ZodMultipartFiles = (
  schema: ZodSchema,
  fileField = 'files',
  maxCount = 10,
) =>
  UseInterceptors(
    FilesInterceptor(fileField, maxCount),
    new ZodMultipartInterceptor(schema),
  );
