import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { ERRORS } from 'src/common/errors';

interface CompoundValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

@Injectable()
export class CompoundZodValidationPipe implements PipeTransform {
  constructor(private schemas: CompoundValidationSchemas) {}

  transform(value: any, metadata: ArgumentMetadata) {
    let schema: ZodSchema | undefined;

    switch (metadata.type) {
      case 'body':
        schema = this.schemas.body;
        break;
      case 'param':
        schema = this.schemas.params;
        break;
      case 'query':
        schema = this.schemas.query;
        break;
      default:
        return value;
    }

    if (!schema) {
      return value;
    }

    try {
      const parsedValue = schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        throw new BadRequestException({
          message: ERRORS.VALIDATION_FAILED,
          errors: errorMessages,
        });
      }
  throw new BadRequestException(ERRORS.VALIDATION_FAILED);
    }
  }
}
