import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ERRORS } from 'src/common/errors';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any) {
    try {
      const parsedValue = this.schema.parse(value);
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
