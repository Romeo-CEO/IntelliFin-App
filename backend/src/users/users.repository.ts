import { Injectable } from '@nestjs/common';
import { Prisma, User, UserStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by email within a tenant
   */
  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        tenantId,
      },
    });
  }

  /**
   * Update user by ID
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete user by ID (soft delete)
   */
  async delete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });
  }

  /**
   * Find users by tenant
   */
  async findByTenant(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.UserOrderByWithRelationInput;
      where?: Prisma.UserWhereInput;
    },
  ): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...options?.where,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Count users by tenant
   */
  async countByTenant(
    tenantId: string,
    where?: Prisma.UserWhereInput,
  ): Promise<number> {
    return this.prisma.user.count({
      where: {
        tenantId,
        deletedAt: null,
        ...where,
      },
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole, tenantId?: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        role,
        ...(tenantId && { tenantId }),
        deletedAt: null,
      },
    });
  }

  /**
   * Find users by status
   */
  async findByStatus(status: UserStatus, tenantId?: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        status,
        ...(tenantId && { tenantId }),
        deletedAt: null,
      },
    });
  }

  /**
   * Update user last login
   */
  async updateLastLogin(id: string, ipAddress?: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        failedLoginAttempts: 0, // Reset failed attempts on successful login
      },
    });
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const failedAttempts = user.failedLoginAttempts + 1;
    const updateData: Prisma.UserUpdateInput = {
      failedLoginAttempts: failedAttempts,
    };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Unlock user account
   */
  async unlockAccount(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
  }

  /**
   * Find locked users
   */
  async findLockedUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        lockedUntil: {
          gt: new Date(),
        },
        deletedAt: null,
      },
    });
  }

  /**
   * Find users with unverified emails
   */
  async findUnverifiedUsers(olderThan?: Date): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        emailVerified: false,
        deletedAt: null,
        ...(olderThan && {
          createdAt: {
            lt: olderThan,
          },
        }),
      },
    });
  }

  /**
   * Search users
   */
  async search(
    tenantId: string,
    query: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          {
            firstName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user statistics for a tenant
   */
  async getTenantUserStats(tenantId: string) {
    const [total, active, inactive, pending, admins] = await Promise.all([
      this.countByTenant(tenantId),
      this.countByTenant(tenantId, { status: UserStatus.ACTIVE }),
      this.countByTenant(tenantId, { status: UserStatus.INACTIVE }),
      this.countByTenant(tenantId, { status: UserStatus.PENDING_VERIFICATION }),
      this.countByTenant(tenantId, { 
        role: { in: [UserRole.ADMIN, UserRole.TENANT_ADMIN] } 
      }),
    ]);

    return {
      total,
      active,
      inactive,
      pending,
      admins,
    };
  }
}
