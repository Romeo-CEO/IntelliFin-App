import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  JournalEntry,
  JournalEntryLine,
  JournalEntryType,
  Prisma,
  SourceType,
} from '@prisma/client';

export interface CreateJournalEntryLineDto {
  debitAccountId?: string;
  creditAccountId?: string;
  amount: number;
  description?: string;
  reference?: string;
  lineNumber: number;
}

export interface CreateJournalEntryDto {
  entryNumber: string;
  entryDate: Date;
  description: string;
  reference?: string;
  entryType: JournalEntryType;
  isReversing?: boolean;
  reversedEntryId?: string;
  sourceType?: SourceType;
  sourceId?: string;
  currency?: string;
  lines: CreateJournalEntryLineDto[];
  createdBy: string;
}

export interface UpdateJournalEntryDto {
  entryDate?: Date;
  description?: string;
  reference?: string;
  entryType?: JournalEntryType;
  lines?: CreateJournalEntryLineDto[];
}

export interface JournalEntryQueryDto {
  page?: number;
  limit?: number;
  entryType?: JournalEntryType;
  sourceType?: SourceType;
  sourceId?: string;
  isPosted?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: (JournalEntryLine & {
    debitAccount?: { accountCode: string; accountName: string };
    creditAccount?: { accountCode: string; accountName: string };
  })[];
}

@Injectable()
export class JournalEntryRepository {
  private readonly logger = new Logger(JournalEntryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new journal entry with lines
   */
  async create(
    organizationId: string,
    data: CreateJournalEntryDto
  ): Promise<JournalEntryWithLines> {
    try {
      // Validate that debits equal credits
      const totalDebits = data.lines
        .filter(line => line.debitAccountId)
        .reduce((sum, line) => sum + line.amount, 0);

      const totalCredits = data.lines
        .filter(line => line.creditAccountId)
        .reduce((sum, line) => sum + line.amount, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error('Total debits must equal total credits');
      }

      // Check if entry number already exists
      const existingEntry = await this.findByEntryNumber(
        organizationId,
        data.entryNumber
      );
      if (existingEntry) {
        throw new Error(
          `Journal entry with number ${data.entryNumber} already exists`
        );
      }

      return await this.prisma.journalEntry.create({
        data: {
          organizationId,
          entryNumber: data.entryNumber,
          entryDate: data.entryDate,
          description: data.description,
          reference: data.reference,
          entryType: data.entryType,
          isReversing: data.isReversing ?? false,
          reversedEntryId: data.reversedEntryId,
          sourceType: data.sourceType,
          sourceId: data.sourceId,
          totalDebit: totalDebits,
          totalCredit: totalCredits,
          currency: data.currency ?? 'ZMW',
          createdBy: data.createdBy,
          lines: {
            create: data.lines.map(line => ({
              debitAccountId: line.debitAccountId,
              creditAccountId: line.creditAccountId,
              amount: line.amount,
              description: line.description,
              reference: line.reference,
              lineNumber: line.lineNumber,
            })),
          },
        },
        include: {
          lines: {
            include: {
              debitAccount: {
                select: { accountCode: true, accountName: true },
              },
              creditAccount: {
                select: { accountCode: true, accountName: true },
              },
            },
            orderBy: { lineNumber: 'asc' },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create journal entry: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Find journal entry by ID
   */
  async findById(
    organizationId: string,
    id: string
  ): Promise<JournalEntryWithLines | null> {
    try {
      return await this.prisma.journalEntry.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
        include: {
          lines: {
            include: {
              debitAccount: {
                select: { accountCode: true, accountName: true },
              },
              creditAccount: {
                select: { accountCode: true, accountName: true },
              },
            },
            orderBy: { lineNumber: 'asc' },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find journal entry by ID: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Find journal entry by entry number
   */
  async findByEntryNumber(
    organizationId: string,
    entryNumber: string
  ): Promise<JournalEntry | null> {
    try {
      return await this.prisma.journalEntry.findFirst({
        where: {
          organizationId,
          entryNumber,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find journal entry by number: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Find all journal entries with pagination and filtering
   */
  async findMany(
    organizationId: string,
    query: JournalEntryQueryDto
  ): Promise<{
    entries: JournalEntryWithLines[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 50;
      const skip = (page - 1) * limit;

      const where: Prisma.JournalEntryWhereInput = {
        organizationId,
        deletedAt: null,
        ...(query.entryType && { entryType: query.entryType }),
        ...(query.sourceType && { sourceType: query.sourceType }),
        ...(query.sourceId && { sourceId: query.sourceId }),
        ...(query.isPosted !== undefined && { isPosted: query.isPosted }),
        ...(query.dateFrom &&
          query.dateTo && {
            entryDate: {
              gte: query.dateFrom,
              lte: query.dateTo,
            },
          }),
        ...(query.search && {
          OR: [
            { entryNumber: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { reference: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      };

      const orderBy: Prisma.JournalEntryOrderByWithRelationInput = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'desc';
      } else {
        orderBy.entryDate = 'desc';
      }

      const [entries, total] = await Promise.all([
        this.prisma.journalEntry.findMany({
          where,
          include: {
            lines: {
              include: {
                debitAccount: {
                  select: { accountCode: true, accountName: true },
                },
                creditAccount: {
                  select: { accountCode: true, accountName: true },
                },
              },
              orderBy: { lineNumber: 'asc' },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.journalEntry.count({ where }),
      ]);

      return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to find journal entries: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update journal entry (only if not posted)
   */
  async update(
    organizationId: string,
    id: string,
    data: UpdateJournalEntryDto
  ): Promise<JournalEntryWithLines> {
    try {
      // Verify entry exists and is not posted
      const existingEntry = await this.findById(organizationId, id);
      if (!existingEntry) {
        throw new Error('Journal entry not found');
      }

      if (existingEntry.isPosted) {
        throw new Error('Cannot update posted journal entry');
      }

      // If updating lines, validate debits equal credits
      if (data.lines) {
        const totalDebits = data.lines
          .filter(line => line.debitAccountId)
          .reduce((sum, line) => sum + line.amount, 0);

        const totalCredits = data.lines
          .filter(line => line.creditAccountId)
          .reduce((sum, line) => sum + line.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new Error('Total debits must equal total credits');
        }

        // Delete existing lines and create new ones
        await this.prisma.journalEntryLine.deleteMany({
          where: { journalEntryId: id },
        });

        return await this.prisma.journalEntry.update({
          where: { id },
          data: {
            ...data,
            totalDebit: totalDebits,
            totalCredit: totalCredits,
            updatedAt: new Date(),
            lines: {
              create: data.lines.map(line => ({
                debitAccountId: line.debitAccountId,
                creditAccountId: line.creditAccountId,
                amount: line.amount,
                description: line.description,
                reference: line.reference,
                lineNumber: line.lineNumber,
              })),
            },
          },
          include: {
            lines: {
              include: {
                debitAccount: {
                  select: { accountCode: true, accountName: true },
                },
                creditAccount: {
                  select: { accountCode: true, accountName: true },
                },
              },
              orderBy: { lineNumber: 'asc' },
            },
          },
        });
      } else {
        return await this.prisma.journalEntry.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
          include: {
            lines: {
              include: {
                debitAccount: {
                  select: { accountCode: true, accountName: true },
                },
                creditAccount: {
                  select: { accountCode: true, accountName: true },
                },
              },
              orderBy: { lineNumber: 'asc' },
            },
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to update journal entry: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Post journal entry (make it permanent)
   */
  async post(
    organizationId: string,
    id: string,
    postedBy: string
  ): Promise<JournalEntryWithLines> {
    try {
      const entry = await this.findById(organizationId, id);
      if (!entry) {
        throw new Error('Journal entry not found');
      }

      if (entry.isPosted) {
        throw new Error('Journal entry is already posted');
      }

      return await this.prisma.journalEntry.update({
        where: { id },
        data: {
          isPosted: true,
          postedAt: new Date(),
          postedBy,
        },
        include: {
          lines: {
            include: {
              debitAccount: {
                select: { accountCode: true, accountName: true },
              },
              creditAccount: {
                select: { accountCode: true, accountName: true },
              },
            },
            orderBy: { lineNumber: 'asc' },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to post journal entry: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Soft delete journal entry (only if not posted)
   */
  async delete(organizationId: string, id: string): Promise<JournalEntry> {
    try {
      const existingEntry = await this.findById(organizationId, id);
      if (!existingEntry) {
        throw new Error('Journal entry not found');
      }

      if (existingEntry.isPosted) {
        throw new Error('Cannot delete posted journal entry');
      }

      return await this.prisma.journalEntry.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete journal entry: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Generate next entry number
   */
  async generateEntryNumber(
    organizationId: string,
    entryType: JournalEntryType
  ): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const prefix = this.getEntryNumberPrefix(entryType);

      const lastEntry = await this.prisma.journalEntry.findFirst({
        where: {
          organizationId,
          entryType,
          entryNumber: {
            startsWith: `${prefix}${year}`,
          },
        },
        orderBy: {
          entryNumber: 'desc',
        },
      });

      let nextNumber = 1;
      if (lastEntry) {
        const lastNumber = parseInt(lastEntry.entryNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      this.logger.error(
        `Failed to generate entry number: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private getEntryNumberPrefix(entryType: JournalEntryType): string {
    switch (entryType) {
      case 'STANDARD':
        return 'JE';
      case 'ADJUSTING':
        return 'AJE';
      case 'CLOSING':
        return 'CJE';
      case 'REVERSING':
        return 'RJE';
      case 'OPENING':
        return 'OJE';
      case 'CORRECTION':
        return 'COR';
      default:
        return 'JE';
    }
  }
}
