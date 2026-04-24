import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TOKEN_MAP } from '../errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any = {
      error: true,
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      const exStatus = exception.getStatus();
      const exResponse = exception.getResponse();

      // Default to the exception's status
      status = exStatus || status;

      // exResponse can be a string or an object
      if (typeof exResponse === 'string') {
        const token = exResponse;
        if (TOKEN_MAP[token]) {
          body = {
            error: true,
            code: token,
            message: TOKEN_MAP[token].message,
          };
          status = TOKEN_MAP[token].status;
        } else {
          body = { error: true, message: exResponse };
        }
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        // Try to detect a token inside the response.message
        const maybeMessage = (exResponse as any).message;
        if (typeof maybeMessage === 'string' && TOKEN_MAP[maybeMessage]) {
          // Spread the full response so extra fields like `errors` are preserved.
          const { message: _msg, ...rest } = exResponse as Record<string, any>;
          body = {
            error: true,
            code: maybeMessage,
            message: TOKEN_MAP[maybeMessage].message,
            ...rest,
          };
          status = TOKEN_MAP[maybeMessage].status;
        } else {
          // Preserve structure (e.g., { message: 'Validation failed', errors: [...] })
          body = { error: true, ...(exResponse as object) };
        }
      }
    } else if (exception instanceof Error) {
      body = { error: true, message: exception.message };
    }

    // Attach contextual fields
    body.timestamp = new Date().toISOString();
    body.path = request?.url;

    response.status(status).json(body);
  }
}
