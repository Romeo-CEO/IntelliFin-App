import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './services/account.service';
import { JournalEntryService } from './services/journal-entry.service';
import { GeneralLedgerService } from './services/general-ledger.service';
import { AccountRepository } from './repositories/account.repository';
import { JournalEntryRepository } from './repositories/journal-entry.repository';
import { GeneralLedgerRepository } from './repositories/general-ledger.repository';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { PrismaService } from '../database/prisma.service';
import { AccountType, JournalEntryType, NormalBalance } from '@prisma/client';
import { Account, JournalEntry, JournalEntryLine } from '@prisma/client';
import { CreateJournalEntryServiceDto } from './dto/create-journal-entry-service.dto';
import { GeneralLedgerEntry } from '@prisma/client';

describe('Accounting Integration Tests', () => {
  let module: TestingModule;
  let accountService: AccountService;
  let journalEntryService: JournalEntryService;
  let generalLedgerService: GeneralLedgerService;
  let prismaService: PrismaService;

  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        AccountService,
        JournalEntryService,
        GeneralLedgerService,
        AccountRepository,
        JournalEntryRepository,
        GeneralLedgerRepository,
        ChartOfAccountsService,
        {
          provide: PrismaService,
          useValue: {
            account: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            journalEntry: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            journalEntryLine: {
              deleteMany: jest.fn(),
            },
            generalLedgerEntry: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
              aggregate: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    accountService = module.get<AccountService>(AccountService);
    journalEntryService = module.get<JournalEntryService>(JournalEntryService);
    generalLedgerService =
      module.get<GeneralLedgerService>(GeneralLedgerService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Chart of Accounts', () => {
    it('should initialize chart of accounts with default Zambian accounts', async () => {
      // Mock the create method to return a sample account
      const mockAccount = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        organizationId: mockOrganizationId,
        accountCode: '1100',
        accountName: 'Cash on Hand',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        isActive: true,
        isSystem: true,
        isBankAccount: false,
        isTaxAccount: false,
        currentBalance: 0,
        currency: 'ZMW',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        accountSubType: null,
        parentAccountId: null,
        description: 'Physical cash in the business',
        accountNumber: null,
        bankName: null,
        taxCode: null,
      };

      jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService.account, 'create')
        .mockResolvedValue(mockAccount);

      const result = await accountService.initializeChartOfAccounts({
        organizationId: mockOrganizationId,
        includeDefaultAccounts: true,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // The actual number will depend on how many accounts are created successfully
      expect(result.length).toBeGreaterThan(0);
    });

    it('should create a new account', async () => {
      const mockAccount = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        organizationId: mockOrganizationId,
        accountCode: '1150',
        accountName: 'Petty Cash',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        isActive: true,
        isSystem: false,
        isBankAccount: false,
        isTaxAccount: false,
        currentBalance: 0,
        currency: 'ZMW',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        accountSubType: null,
        parentAccountId: null,
        description: 'Small cash fund for minor expenses',
        accountNumber: null,
        bankName: null,
        taxCode: null,
      };

      jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService.account, 'create')
        .mockResolvedValue(mockAccount);

      const createAccountDto = {
        accountCode: '1150',
        accountName: 'Petty Cash',
        accountType: AccountType.ASSET,
        normalBalance: NormalBalance.DEBIT,
        description: 'Small cash fund for minor expenses',
      };

      const result = await accountService.createAccount(
        mockOrganizationId,
        createAccountDto
      );

      expect(result).toBeDefined();
      expect(result.accountCode).toBe('1150');
      expect(result.accountName).toBe('Petty Cash');
      expect(result.accountType).toBe(AccountType.ASSET);
    });
  });

  describe('Journal Entries', () => {
    it('should create a journal entry with balanced debits and credits', async () => {
      const mockJournalEntry = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        organizationId: mockOrganizationId,
        entryNumber: 'JE20240001',
        entryDate: new Date(),
        description: 'Test journal entry',
        reference: 'TEST-001',
        entryType: JournalEntryType.STANDARD,
        isReversing: false,
        reversedEntryId: null,
        isPosted: false,
        postedAt: null,
        postedBy: null,
        sourceType: null,
        sourceId: null,
        totalDebit: 1000,
        totalCredit: 1000,
        currency: 'ZMW',
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lines: [
          {
            id: '123e4567-e89b-12d3-a456-426614174005',
            journalEntryId: '123e4567-e89b-12d3-a456-426614174004',
            debitAccountId: '123e4567-e89b-12d3-a456-426614174002',
            creditAccountId: null,
            amount: 1000,
            description: 'Cash received',
            reference: null,
            lineNumber: 1,
            debitAccount: {
              accountCode: '1100',
              accountName: 'Cash on Hand',
            },
            creditAccount: null,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174006',
            journalEntryId: '123e4567-e89b-12d3-a456-426614174004',
            debitAccountId: null,
            creditAccountId: '123e4567-e89b-12d3-a456-426614174007',
            amount: 1000,
            description: 'Revenue earned',
            reference: null,
            lineNumber: 2,
            debitAccount: null,
            creditAccount: {
              accountCode: '4100',
              accountName: 'Sales Revenue',
            },
          },
        ],
      };

      // Mock account lookup
      jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174002',
        accountCode: '1100',
      } as Account);

      jest
        .spyOn(prismaService.journalEntry, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.journalEntry, 'create')
        .mockResolvedValue(mockJournalEntry as JournalEntry & { lines: JournalEntryLine[] });

      const createJournalEntryDto = {
        entryDate: new Date(),
        description: 'Test journal entry',
        reference: 'TEST-001',
        entryType: JournalEntryType.STANDARD,
        lines: [
          {
            accountCode: '1100',
            debitAmount: 1000,
            description: 'Cash received',
          },
          {
            accountCode: '4100',
            creditAmount: 1000,
            description: 'Revenue earned',
          },
        ],
        createdBy: mockUserId
      } as CreateJournalEntryServiceDto;

      const result = await journalEntryService.createJournalEntry(
        mockOrganizationId,
        createJournalEntryDto
      );

      expect(result).toBeDefined();
      expect(result.entryNumber).toBe('JE20240001');
      expect(result.totalDebit).toBe(1000);
      expect(result.totalCredit).toBe(1000);
      expect(result.lines).toHaveLength(2);
    });
  });

  describe('General Ledger', () => {
    it('should generate trial balance', async () => {
      jest.spyOn(prismaService.account, 'findMany').mockResolvedValue([
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          accountCode: '1100',
          accountName: 'Cash on Hand',
          accountType: 'ASSET',
          normalBalance: 'DEBIT',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174007',
          accountCode: '4100',
          accountName: 'Sales Revenue',
          accountType: 'REVENUE',
          normalBalance: 'CREDIT',
        },
      ] as Account[]);

      jest
        .spyOn(prismaService.generalLedgerEntry, 'aggregate')
        .mockResolvedValue({
          _sum: {
            debitAmount: 1000,
            creditAmount: 0,
          },
        } as object);

      jest
        .spyOn(prismaService.generalLedgerEntry, 'findFirst')
        .mockResolvedValue({
          runningBalance: 1000,
        } as GeneralLedgerEntry);

      const result = await generalLedgerService.generateTrialBalance(
        mockOrganizationId,
        new Date()
      );

      expect(result).toBeDefined();
      expect(result.isBalanced).toBe(true);
      expect(result.accounts).toHaveLength(2);
      expect(result.totalDebits).toBe(result.totalCredits);
    });
  });
});
