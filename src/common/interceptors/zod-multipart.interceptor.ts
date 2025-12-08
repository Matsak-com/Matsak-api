import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { ERRORS } from '../errors';
import { ZodSchema, ZodError } from 'zod';
import { Observable } from 'rxjs';

@Injectable()
export class ZodMultipartInterceptor implements NestInterceptor {
  constructor(private schema: ZodSchema) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    try {
      const parsed = this.schema.parse(req.body);
      // Replace request body with parsed/validated object
      req.body = parsed;
      return next.handle();
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
      throw error;
    }
  }
}
