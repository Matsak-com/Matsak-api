import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user.schema';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict route access to specific roles.
 * SUPERADMIN automatically bypasses all role restrictions via RolesGuard.
 *
 * @example
 * @Roles(UserRole.ADMIN)
 * @example
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
