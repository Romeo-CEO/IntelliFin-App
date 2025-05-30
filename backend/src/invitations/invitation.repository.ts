import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { InvitationStatus, Prisma, UserInvitation } from '@prisma/client';

@Injectable()
export class InvitationRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Prisma.UserInvitationCreateInput
  ): Promise<UserInvitation> {
    return this.prisma.userInvitation.create({
      data,
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<UserInvitation | null> {
    return this.prisma.userInvitation.findUnique({
      where: { id },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        invitee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findByToken(token: string): Promise<UserInvitation | null> {
    return this.prisma.userInvitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string,
    status?: InvitationStatus
  ): Promise<UserInvitation | null> {
    return this.prisma.userInvitation.findFirst({
      where: {
        email,
        tenantId,
        ...(status && { status }),
      },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.UserInvitationUpdateInput
  ): Promise<UserInvitation> {
    return this.prisma.userInvitation.update({
      where: { id },
      data,
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        invitee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<UserInvitation> {
    return this.prisma.userInvitation.delete({
      where: { id },
    });
  }

  async findByTenant(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.UserInvitationOrderByWithRelationInput;
      where?: Prisma.UserInvitationWhereInput;
    }
  ): Promise<UserInvitation[]> {
    return this.prisma.userInvitation.findMany({
      where: {
        tenantId,
        ...options?.where,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        invitee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async countByTenant(
    tenantId: string,
    where?: Prisma.UserInvitationWhereInput
  ): Promise<number> {
    return this.prisma.userInvitation.count({
      where: {
        tenantId,
        ...where,
      },
    });
  }

  async findExpiredInvitations(): Promise<UserInvitation[]> {
    return this.prisma.userInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async markAsExpired(ids: string[]): Promise<number> {
    const result = await this.prisma.userInvitation.updateMany({
      where: {
        id: {
          in: ids,
        },
        status: InvitationStatus.PENDING,
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });
    return result.count;
  }

  async findPendingByEmail(email: string): Promise<UserInvitation[]> {
    return this.prisma.userInvitation.findMany({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async cancelInvitation(id: string): Promise<UserInvitation> {
    return this.prisma.userInvitation.update({
      where: { id },
      data: {
        status: InvitationStatus.CANCELLED,
      },
    });
  }

  async bulkCreate(
    invitations: Prisma.UserInvitationCreateManyInput[]
  ): Promise<number> {
    const result = await this.prisma.userInvitation.createMany({
      data: invitations,
      skipDuplicates: true,
    });
    return result.count;
  }

  async findByInviter(
    inviterId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: InvitationStatus;
    }
  ): Promise<UserInvitation[]> {
    return this.prisma.userInvitation.findMany({
      where: {
        invitedBy: inviterId,
        ...(options?.status && { status: options.status }),
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
      include: {
        invitee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getInvitationStats(tenantId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    cancelled: number;
  }> {
    const [total, pending, accepted, expired, cancelled] = await Promise.all([
      this.countByTenant(tenantId),
      this.countByTenant(tenantId, { status: InvitationStatus.PENDING }),
      this.countByTenant(tenantId, { status: InvitationStatus.ACCEPTED }),
      this.countByTenant(tenantId, { status: InvitationStatus.EXPIRED }),
      this.countByTenant(tenantId, { status: InvitationStatus.CANCELLED }),
    ]);

    return {
      total,
      pending,
      accepted,
      expired,
      cancelled,
    };
  }
}
