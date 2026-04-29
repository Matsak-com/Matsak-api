import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../../users/user.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Global roles guard.
 * - SUPERADMIN bypasses ALL role restrictions automatically.
 * - Routes without @Roles() are accessible to any authenticated user.
 * - Routes with @Roles(...) require a valid JWT AND at least one matching role.
 *
 * Extends AuthGuard('jwt') so that when @Roles() is present the JWT is
 * validated inline — regardless of whether a route-level JwtAuthGuard also
 * runs.  This avoids the guard-ordering problem where a global APP_GUARD
 * executes before route-level guards and sees request.user as undefined.
 *
 * Register globally via APP_GUARD in app.module.ts.
 */
@Injectable()
export class RolesGuard extends AuthGuard('jwt') {
  constructor(private readonly rolesReflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.rolesReflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role restriction on this route — skip JWT check here; let any
    // route-level JwtAuthGuard handle authentication as usual.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Role restriction present — validate JWT now (populates request.user).
    // Throws UnauthorizedException automatically if token is missing/invalid.
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    // SUPERADMIN bypasses all role restrictions
    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
