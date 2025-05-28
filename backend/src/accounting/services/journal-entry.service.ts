import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JournalEntryRepository, CreateJournalEntryDto, UpdateJournalEntryDto, JournalEntryQueryDto, JournalEntryWithLines } from '../repositories/journal-entry.repository';
import { GeneralLedgerRepository, CreateGeneralLedgerEntryDto } from '../repositories/general-ledger.repository';
import { AccountRepository } from '../repositories/account.repository';
import { JournalEntry, JournalEntryType, SourceType } from '@prisma/client';

export interface CreateJournalEntryServiceDto {
  entryDate: Date;
  description: string;
  reference?: string;
  entryType: JournalEntryType;
  sourceType?: SourceType;
  sourceId?: string;
  lines: {
    accountCode?: string;
    accountId?: string;
    debitAmount?: number;
    creditAmount?: number;
    description?: string;
    reference?: string;
  }[];
  createdBy: string;
}

export interface PostJournalEntryDto {
  journalEntryId: string;
  postedBy: string;
}

export interface ReverseJournalEntryDto {
  originalEntryId: string;
  reversalDate: Date;
  reversalReason: string;
  createdBy: string;
}

@Injectable()
export class JournalEntryService {
  private readonly logger = new Logger(JournalEntryService.name);

  constructor(
    private readonly journalEntryRepository: JournalEntryRepository,
    private readonly generalLedgerRepository: GeneralLedgerRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  /**
   * Create a new journal entry
   */
  async createJournalEntry(organizationId: string, data: CreateJournalEntryServiceDto): Promise<JournalEntryWithLines> {
    try {
      this.logger.log(`Creating journal entry for organization: ${organizationId}`);

      // Validate and prepare lines
      const preparedLines = await this.prepareJournalEntryLines(organizationId, data.lines);

      // Generate entry number
      const entryNumber = await this.journalEntryRepository.generateEntryNumber(organizationId, data.entryType);

      // Create journal entry
      const journalEntryData: CreateJournalEntryDto = {
        entryNumber,
        entryDate: data.entryDate,
        description: data.description,
        reference: data.reference,
        entryType: data.entryType,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        lines: preparedLines,
        createdBy: data.createdBy,
      };

      const journalEntry = await this.journalEntryRepository.create(organizationId, journalEntryData);

      this.logger.log(`Created journal entry: ${journalEntry.entryNumber}`);
      return journalEntry;
    } catch (error) {
      this.logger.error(`Failed to create journal entry: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create journal entry');
    }
  }

  /**
   * Get journal entry by ID
   */
  async getJournalEntryById(organizationId: string, id: string): Promise<JournalEntryWithLines> {
    try {
      const journalEntry = await this.journalEntryRepository.findById(organizationId, id);
      if (!journalEntry) {
        throw new NotFoundException('Journal entry not found');
      }
      return journalEntry;
    } catch (error) {
      this.logger.error(`Failed to get journal entry: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get journal entry');
    }
  }

  /**
   * Get journal entries with pagination and filtering
   */
  async getJournalEntries(organizationId: string, query: JournalEntryQueryDto) {
    try {
      return await this.journalEntryRepository.findMany(organizationId, query);
    } catch (error) {
      this.logger.error(`Failed to get journal entries: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get journal entries');
    }
  }

  /**
   * Update journal entry (only if not posted)
   */
  async updateJournalEntry(organizationId: string, id: string, data: UpdateJournalEntryDto): Promise<JournalEntryWithLines> {
    try {
      // If updating lines, validate and prepare them
      if (data.lines) {
        const preparedLines = await this.prepareJournalEntryLines(organizationId, data.lines.map(line => ({
          accountId: line.debitAccountId || line.creditAccountId,
          debitAmount: line.debitAccountId ? line.amount : undefined,
          creditAmount: line.creditAccountId ? line.amount : undefined,
          description: line.description,
          reference: line.reference,
        })));

        data.lines = preparedLines;
      }

      return await this.journalEntryRepository.update(organizationId, id, data);
    } catch (error) {
      this.logger.error(`Failed to update journal entry: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update journal entry');
    }
  }

  /**
   * Post journal entry (make it permanent and create general ledger entries)
   */
  async postJournalEntry(organizationId: string, data: PostJournalEntryDto): Promise<JournalEntryWithLines> {
    try {
      this.logger.log(`Posting journal entry: ${data.journalEntryId}`);

      // Get the journal entry
      const journalEntry = await this.journalEntryRepository.findById(organizationId, data.journalEntryId);
      if (!journalEntry) {
        throw new NotFoundException('Journal entry not found');
      }

      if (journalEntry.isPosted) {
        throw new BadRequestException('Journal entry is already posted');
      }

      // Create general ledger entries
      const generalLedgerEntries: CreateGeneralLedgerEntryDto[] = [];

      for (const line of journalEntry.lines) {
        if (line.debitAccountId) {
          generalLedgerEntries.push({
            accountId: line.debitAccountId,
            journalEntryId: journalEntry.id,
            entryDate: journalEntry.entryDate,
            debitAmount: line.amount,
            creditAmount: 0,
            description: line.description || journalEntry.description,
            reference: line.reference || journalEntry.reference,
            sourceType: journalEntry.sourceType,
            sourceId: journalEntry.sourceId,
          });
        }

        if (line.creditAccountId) {
          generalLedgerEntries.push({
            accountId: line.creditAccountId,
            journalEntryId: journalEntry.id,
            entryDate: journalEntry.entryDate,
            debitAmount: 0,
            creditAmount: line.amount,
            description: line.description || journalEntry.description,
            reference: line.reference || journalEntry.reference,
            sourceType: journalEntry.sourceType,
            sourceId: journalEntry.sourceId,
          });
        }
      }

      // Create general ledger entries
      await this.generalLedgerRepository.createFromJournalEntry(
        organizationId,
        journalEntry.id,
        generalLedgerEntries
      );

      // Mark journal entry as posted
      const postedEntry = await this.journalEntryRepository.post(organizationId, data.journalEntryId, data.postedBy);

      this.logger.log(`Posted journal entry: ${postedEntry.entryNumber}`);
      return postedEntry;
    } catch (error) {
      this.logger.error(`Failed to post journal entry: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to post journal entry');
    }
  }

  /**
   * Reverse a posted journal entry
   */
  async reverseJournalEntry(organizationId: string, data: ReverseJournalEntryDto): Promise<JournalEntryWithLines> {
    try {
      this.logger.log(`Reversing journal entry: ${data.originalEntryId}`);

      // Get the original journal entry
      const originalEntry = await this.journalEntryRepository.findById(organizationId, data.originalEntryId);
      if (!originalEntry) {
        throw new NotFoundException('Original journal entry not found');
      }

      if (!originalEntry.isPosted) {
        throw new BadRequestException('Can only reverse posted journal entries');
      }

      // Create reversing entry with opposite debits and credits
      const reversingLines = originalEntry.lines.map((line, index) => ({
        debitAccountId: line.creditAccountId, // Swap debit and credit
        creditAccountId: line.debitAccountId, // Swap debit and credit
        amount: line.amount,
        description: `Reversal: ${line.description || originalEntry.description}`,
        reference: line.reference,
        lineNumber: index + 1,
      }));

      const reversingEntryData: CreateJournalEntryDto = {
        entryNumber: await this.journalEntryRepository.generateEntryNumber(organizationId, 'REVERSING'),
        entryDate: data.reversalDate,
        description: `Reversal: ${data.reversalReason}`,
        reference: originalEntry.reference,
        entryType: 'REVERSING',
        isReversing: true,
        reversedEntryId: originalEntry.id,
        sourceType: originalEntry.sourceType,
        sourceId: originalEntry.sourceId,
        lines: reversingLines,
        createdBy: data.createdBy,
      };

      // Create the reversing entry
      const reversingEntry = await this.journalEntryRepository.create(organizationId, reversingEntryData);

      // Post the reversing entry immediately
      const postedReversingEntry = await this.postJournalEntry(organizationId, {
        journalEntryId: reversingEntry.id,
        postedBy: data.createdBy,
      });

      this.logger.log(`Created reversing journal entry: ${postedReversingEntry.entryNumber}`);
      return postedReversingEntry;
    } catch (error) {
      this.logger.error(`Failed to reverse journal entry: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to reverse journal entry');
    }
  }

  /**
   * Delete journal entry (only if not posted)
   */
  async deleteJournalEntry(organizationId: string, id: string): Promise<JournalEntry> {
    try {
      return await this.journalEntryRepository.delete(organizationId, id);
    } catch (error) {
      this.logger.error(`Failed to delete journal entry: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete journal entry');
    }
  }

  /**
   * Create journal entry from invoice
   */
  async createJournalEntryFromInvoice(organizationId: string, invoiceId: string, createdBy: string): Promise<JournalEntryWithLines> {
    try {
      // This would integrate with the invoice service to get invoice details
      // For now, this is a placeholder for the integration
      throw new BadRequestException('Invoice integration not yet implemented');
    } catch (error) {
      this.logger.error(`Failed to create journal entry from invoice: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create journal entry from payment
   */
  async createJournalEntryFromPayment(organizationId: string, paymentId: string, createdBy: string): Promise<JournalEntryWithLines> {
    try {
      // This would integrate with the payment service to get payment details
      // For now, this is a placeholder for the integration
      throw new BadRequestException('Payment integration not yet implemented');
    } catch (error) {
      this.logger.error(`Failed to create journal entry from payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create journal entry from expense
   */
  async createJournalEntryFromExpense(organizationId: string, expenseId: string, createdBy: string): Promise<JournalEntryWithLines> {
    try {
      // This would integrate with the expense service to get expense details
      // For now, this is a placeholder for the integration
      throw new BadRequestException('Expense integration not yet implemented');
    } catch (error) {
      this.logger.error(`Failed to create journal entry from expense: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Private helper methods

  private async prepareJournalEntryLines(organizationId: string, lines: any[]) {
    const preparedLines = [];
    let lineNumber = 1;

    for (const line of lines) {
      let accountId = line.accountId;

      // If account code is provided instead of ID, look up the account
      if (line.accountCode && !accountId) {
        const account = await this.accountRepository.findByCode(organizationId, line.accountCode);
        if (!account) {
          throw new BadRequestException(`Account not found: ${line.accountCode}`);
        }
        accountId = account.id;
      }

      if (!accountId) {
        throw new BadRequestException('Account ID or account code is required for each line');
      }

      // Validate that either debit or credit is specified, but not both
      const hasDebit = line.debitAmount && line.debitAmount > 0;
      const hasCredit = line.creditAmount && line.creditAmount > 0;

      if (hasDebit && hasCredit) {
        throw new BadRequestException('A line cannot have both debit and credit amounts');
      }

      if (!hasDebit && !hasCredit) {
        throw new BadRequestException('Each line must have either a debit or credit amount');
      }

      preparedLines.push({
        debitAccountId: hasDebit ? accountId : undefined,
        creditAccountId: hasCredit ? accountId : undefined,
        amount: hasDebit ? line.debitAmount : line.creditAmount,
        description: line.description,
        reference: line.reference,
        lineNumber: lineNumber++,
      });
    }

    return preparedLines;
  }
}
