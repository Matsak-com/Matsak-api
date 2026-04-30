import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { AuditLogService } from '../audit-log.service';
import { AuditAction, AuditStatus } from '../audit-log.schema';
import { SKIP_AUDIT_LOG_KEY } from '../decorators/skip-audit-log.decorator';

/** HTTP methods that represent state-changing operations to always log. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Path segments that map to specific auth actions. */
const AUTH_ACTION_MAP: Record<string, AuditAction> = {
  'auth/login': AuditAction.LOGIN,
  'auth/logout': AuditAction.LOGOUT,
  'auth/register': AuditAction.REGISTER,
  'auth/forgot-password': AuditAction.PASSWORD_RESET_REQUEST,
  'auth/reset-password': AuditAction.PASSWORD_RESET,
  'auth/change-password': AuditAction.PASSWORD_CHANGE,
};

/** Derive the resource name from the request path (first path segment after /api/). */
function extractResource(path: string): string {
  const parts = path.replace(/^\/api\//, '').split('/');
  return parts[0] || 'unknown';
}

/** Derive the action from method + path. */
function resolveAction(method: string, path: string): AuditAction {
  const normalised = path.toLowerCase().replace(/^\/api\//, '');

  for (const [segment, action] of Object.entries(AUTH_ACTION_MAP)) {
    if (normalised.startsWith(segment)) {
      return action;
    }
  }

  if (normalised.includes('/upload')) return AuditAction.UPLOAD;
  if (normalised.includes('/export')) return AuditAction.EXPORT;

  switch (method.toUpperCase()) {
    case 'POST':
      return AuditAction.CREATE;
    case 'PUT':
    case 'PATCH':
      return AuditAction.UPDATE;
    case 'DELETE':
      return AuditAction.DELETE;
    default:
      return AuditAction.READ;
  }
}

/** Extract the real client IP, honouring proxied headers. */
function extractIp(request: Record<string, any>): string | null {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for may be a comma-separated list; take the first entry.
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return first.split(',')[0].trim();
  }
  return request.ip ?? request.connection?.remoteAddress ?? null;
}

/** Extract a resource ID from URL params when available. */
function extractResourceId(params: Record<string, string>): string | null {
  return params?.id ?? params?.resourceId ?? null;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Record<string, any>>();
    const method: string = request.method ?? 'GET';
    const path: string = request.url ?? '';

    const shouldLog =
      WRITE_METHODS.has(method.toUpperCase()) ||
      path.toLowerCase().includes('/auth/');

    if (!shouldLog) {
      return next.handle();
    }

    const user = request.user as
      | { userId?: string; role?: string; current_team?: string }
      | undefined;
    const action = resolveAction(method, path);
    const resource = extractResource(path);
    const ipAddress = extractIp(request);
    const userAgent: string = request.headers?.['user-agent'] ?? null;
    const resourceId = extractResourceId(request.params ?? {});

    return next.handle().pipe(
      tap((responseBody) => {
        const response = httpCtx.getResponse<Record<string, any>>();
        const statusCode: number = response.statusCode ?? 200;

        // Derive resourceId from the response if not found in params (e.g. POST create)
        const createdId =
          resourceId ??
          responseBody?._id?.toString() ??
          responseBody?.id ??
          null;

        void this.auditLogService.log({
          actorId: user?.userId ?? null,
          actorEmail: null, // enriched later if needed
          actorRole: user?.role ?? null,
          teamId: user?.current_team ?? null,
          action,
          resource,
          resourceId: createdId,
          method,
          path,
          statusCode,
          status: AuditStatus.SUCCESS,
          requestBody: request.body ?? null,
          ipAddress,
          userAgent,
        });
      }),
      catchError((err) => {
        const statusCode: number = err?.status ?? err?.statusCode ?? 500;

        void this.auditLogService.log({
          actorId: user?.userId ?? null,
          actorEmail: null,
          actorRole: user?.role ?? null,
          teamId: user?.current_team ?? null,
          action,
          resource,
          resourceId,
          method,
          path,
          statusCode,
          status: AuditStatus.FAILURE,
          requestBody: request.body ?? null,
          ipAddress,
          userAgent,
          errorMessage: err?.message ?? null,
        });

        return throwError(() => err);
      }),
    );
  }
}
