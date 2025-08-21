import { UsePipes } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { CompoundZodValidationPipe } from '../pipes/compound-zod-validation.pipe';

export const ZodValidation = (schema: ZodSchema) =>
  UsePipes(new ZodValidationPipe(schema));

interface CompoundValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const CompoundZodValidation = (schemas: CompoundValidationSchemas) =>
  UsePipes(new CompoundZodValidationPipe(schemas));
