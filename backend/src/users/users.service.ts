import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { User, UserRole, UserStatus } from '@prisma/client';

import { UsersRepository } from './users.repository';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role?: UserRole;
  phone?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  settings?: any;
  timezone?: string;
  language?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Create a new user
   */
  async create(
    userData: CreateUserData,
    hashedPassword: string
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findByEmailAndTenant(
      userData.email,
      userData.tenantId
    );

    if (existingUser) {
      throw new ConflictException(
        'User with this email already exists in this tenant'
      );
    }

    // Create user
    const user = await this.usersRepository.create({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: hashedPassword,
      phone: userData.phone,
      role: userData.role || UserRole.USER,
      status: UserStatus.PENDING_VERIFICATION,
      tenant: {
        connect: { id: userData.tenantId },
      },
    });

    return user;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  /**
   * Find user by email and tenant
   */
  async findByEmailAndTenant(
    email: string,
    tenantId: string
  ): Promise<User | null> {
    return this.usersRepository.findByEmailAndTenant(email, tenantId);
  }

  /**
   * Update user
   */
  async update(id: string, updateData: UpdateUserData): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.update(id, updateData);
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.delete(id);
  }

  /**
   * Get users by tenant with pagination
   */
  async findByTenant(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    let users: User[];
    let total: number;

    if (search) {
      users = await this.usersRepository.search(tenantId, search, {
        skip,
        take: limit,
      });
      // For search, we need to count separately
      const allSearchResults = await this.usersRepository.search(
        tenantId,
        search
      );
      total = allSearchResults.length;
    } else {
      users = await this.usersRepository.findByTenant(tenantId, {
        skip,
        take: limit,
      });
      total = await this.usersRepository.countByTenant(tenantId);
    }

    return {
      users: users.map(this.sanitizeUser),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user role
   */
  async updateRole(
    id: string,
    role: UserRole,
    updatedBy: string
  ): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-role modification for certain roles
    const adminRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.TENANT_ADMIN,
    ];
    if (id === updatedBy && adminRoles.includes(user.role)) {
      throw new BadRequestException('Cannot modify your own admin role');
    }

    return this.usersRepository.update(id, { role });
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.update(id, { status });
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string, ipAddress?: string): Promise<User> {
    return this.usersRepository.updateLastLogin(id, ipAddress);
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: string): Promise<User> {
    return this.usersRepository.incrementFailedLoginAttempts(id);
  }

  /**
   * Unlock user account
   */
  async unlockAccount(id: string): Promise<User> {
    return this.usersRepository.unlockAccount(id);
  }

  /**
   * Get user profile (sanitized)
   */
  async getProfile(id: string): Promise<AuthenticatedUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      settings: user.settings,
      timezone: user.timezone,
      language: user.language,
    };
  }

  /**
   * Get tenant user statistics
   */
  async getTenantStats(tenantId: string) {
    return this.usersRepository.getTenantUserStats(tenantId);
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole, tenantId?: string): Promise<User[]> {
    return this.usersRepository.findByRole(role, tenantId);
  }

  /**
   * Find locked users
   */
  async findLockedUsers(): Promise<User[]> {
    return this.usersRepository.findLockedUsers();
  }

  /**
   * Find unverified users
   */
  async findUnverifiedUsers(olderThanHours: number = 24): Promise<User[]> {
    const olderThan = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    return this.usersRepository.findUnverifiedUsers(olderThan);
  }

  /**
   * Sanitize user data (remove sensitive fields)
   */
  private sanitizeUser(
    user: User
  ): Omit<User, 'password' | 'emailVerificationToken' | 'resetPasswordToken'> {
    const {
      password,
      emailVerificationToken,
      resetPasswordToken,
      ...sanitizedUser
    } = user;
    return sanitizedUser;
  }

  /**
   * Convert User to AuthenticatedUser
   */
  toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      settings: user.settings,
      timezone: user.timezone,
      language: user.language,
    };
  }
}
