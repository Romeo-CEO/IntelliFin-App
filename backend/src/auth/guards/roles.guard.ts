import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../interfaces/auth.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = this.checkUserRole(user.role, requiredRoles);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }

  private checkUserRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    // Define role hierarchy (higher roles include permissions of lower roles)
    const roleHierarchy: Record<UserRole, UserRole[]> = {
      [UserRole.SUPER_ADMIN]: [
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.USER,
        UserRole.VIEWER,
      ],
      [UserRole.TENANT_ADMIN]: [
        UserRole.TENANT_ADMIN,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.USER,
        UserRole.VIEWER,
      ],
      [UserRole.ADMIN]: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.USER,
        UserRole.VIEWER,
      ],
      [UserRole.MANAGER]: [UserRole.MANAGER, UserRole.USER, UserRole.VIEWER],
      [UserRole.USER]: [UserRole.USER, UserRole.VIEWER],
      [UserRole.VIEWER]: [UserRole.VIEWER],
    };

    const userPermissions = roleHierarchy[userRole] || [];

    return requiredRoles.some((role) => userPermissions.includes(role));
  }
}
