import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/user.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Global roles guard.
 * - SUPERADMIN bypasses ALL role restrictions automatically.
 * - Routes without @Roles() are accessible to any authenticated user.
 * - Routes with @Roles(...) require the user to have at least one matching role.
 *
 * Register globally via APP_GUARD in app.module.ts.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role restriction on this route — allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Unauthenticated request — let JwtAuthGuard handle the 401
    if (!user) {
      return false;
    }

    // SUPERADMIN bypasses all role restrictions
    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}
