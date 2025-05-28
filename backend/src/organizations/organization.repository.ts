import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Organization, Prisma } from '@prisma/client';

@Injectable()
export class OrganizationRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return this.prisma.organization.create({
      data,
    });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  async findByZraTin(zraTin: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { zraTin },
    });
  }

  async update(
    id: string,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.OrganizationWhereUniqueInput;
    where?: Prisma.OrganizationWhereInput;
    orderBy?: Prisma.OrganizationOrderByWithRelationInput;
  }): Promise<Organization[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.organization.findMany({
      skip,
      take,
      cursor,
      where: {
        ...where,
        deletedAt: null, // Exclude soft-deleted records
      },
      orderBy,
    });
  }

  async count(where?: Prisma.OrganizationWhereInput): Promise<number> {
    return this.prisma.organization.count({
      where: {
        ...where,
        deletedAt: null, // Exclude soft-deleted records
      },
    });
  }

  async existsByZraTin(zraTin: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: {
        zraTin,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}
