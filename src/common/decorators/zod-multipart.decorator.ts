import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodSchema } from 'zod';
import { ZodMultipartInterceptor } from '../interceptors/zod-multipart.interceptor';

/**
 * Helper decorator to validate multipart/form-data with Zod after Multer runs.
 * Defaults to the file field name 'logoUrl' but an alternative can be provided.
 * Usage: @ZodMultipart(schema) or @ZodMultipart(schema, 'fileField')
 */
export const ZodMultipart = (schema: ZodSchema, fileField = 'logoUrl') =>
  UseInterceptors(
    FileInterceptor(fileField),
    new ZodMultipartInterceptor(schema),
  );
