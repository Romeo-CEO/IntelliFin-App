import {
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GeneralLedgerService } from '../services/general-ledger.service';
import { GeneralLedgerQueryDto } from '../dto/general-ledger.dto';
import { AccountType, SourceType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('General Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/general-ledger')
export class GeneralLedgerController {
  private readonly logger = new Logger(GeneralLedgerController.name);

  constructor(private readonly generalLedgerService: GeneralLedgerService) {}

  @Get('entries')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({
    summary: 'Get general ledger entries with filtering and pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'sourceType', required: false, enum: SourceType })
  @ApiQuery({ name: 'sourceId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date })
  @ApiQuery({ name: 'dateTo', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'General ledger entries retrieved successfully',
  })
  async getGeneralLedgerEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GeneralLedgerQueryDto
  ) {
    try {
      const result = await this.generalLedgerService.getGeneralLedgerEntries(
        user.organizationId,
        query
      );

      return {
        success: true,
        message: 'General ledger entries retrieved successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get general ledger entries: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('account/:accountId/ledger')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({
    summary: 'Get account ledger (all entries for a specific account)',
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date })
  @ApiQuery({ name: 'dateTo', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'Account ledger retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccountLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    try {
      const dateFromParsed = dateFrom ? new Date(dateFrom) : undefined;
      const dateToParsed = dateTo ? new Date(dateTo) : undefined;

      const ledger = await this.generalLedgerService.getAccountLedger(
        user.organizationId,
        accountId,
        dateFromParsed,
        dateToParsed
      );

      return {
        success: true,
        message: 'Account ledger retrieved successfully',
        data: ledger,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get account ledger: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('account/:accountId/balance')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get account balance as of a specific date' })
  @ApiQuery({ name: 'asOfDate', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'Account balance retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccountBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('asOfDate') asOfDate?: string
  ) {
    try {
      const asOfDateParsed = asOfDate ? new Date(asOfDate) : undefined;

      const balance = await this.generalLedgerService.getAccountBalance(
        user.organizationId,
        accountId,
        asOfDateParsed
      );

      return {
        success: true,
        message: 'Account balance retrieved successfully',
        data: {
          accountId,
          balance,
          asOfDate: asOfDateParsed || new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get account balance: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('trial-balance')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Generate trial balance' })
  @ApiQuery({ name: 'asOfDate', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'Trial balance generated successfully',
  })
  async generateTrialBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('asOfDate') asOfDate?: string
  ) {
    try {
      const asOfDateParsed = asOfDate ? new Date(asOfDate) : new Date();

      const trialBalance = await this.generalLedgerService.generateTrialBalance(
        user.organizationId,
        asOfDateParsed
      );

      return {
        success: true,
        message: 'Trial balance generated successfully',
        data: trialBalance,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate trial balance: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('balance-sheet')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Generate balance sheet' })
  @ApiQuery({ name: 'asOfDate', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'Balance sheet generated successfully',
  })
  async generateBalanceSheet(
    @CurrentUser() user: AuthenticatedUser,
    @Query('asOfDate') asOfDate?: string
  ) {
    try {
      const asOfDateParsed = asOfDate ? new Date(asOfDate) : new Date();

      const balanceSheet = await this.generalLedgerService.generateBalanceSheet(
        user.organizationId,
        asOfDateParsed
      );

      return {
        success: true,
        message: 'Balance sheet generated successfully',
        data: balanceSheet,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate balance sheet: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('income-statement')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Generate income statement' })
  @ApiQuery({ name: 'periodFrom', required: true, type: Date })
  @ApiQuery({ name: 'periodTo', required: true, type: Date })
  @ApiResponse({
    status: 200,
    description: 'Income statement generated successfully',
  })
  async generateIncomeStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Query('periodFrom') periodFrom: string,
    @Query('periodTo') periodTo: string
  ) {
    try {
      const periodFromParsed = new Date(periodFrom);
      const periodToParsed = new Date(periodTo);

      const incomeStatement =
        await this.generalLedgerService.generateIncomeStatement(
          user.organizationId,
          periodFromParsed,
          periodToParsed
        );

      return {
        success: true,
        message: 'Income statement generated successfully',
        data: incomeStatement,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate income statement: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('cash-flow')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get cash flow statement data' })
  @ApiQuery({ name: 'periodFrom', required: true, type: Date })
  @ApiQuery({ name: 'periodTo', required: true, type: Date })
  @ApiResponse({
    status: 200,
    description: 'Cash flow data retrieved successfully',
  })
  async getCashFlowData(
    @CurrentUser() user: AuthenticatedUser,
    @Query('periodFrom') periodFrom: string,
    @Query('periodTo') periodTo: string
  ) {
    try {
      const periodFromParsed = new Date(periodFrom);
      const periodToParsed = new Date(periodTo);

      const cashFlowData = await this.generalLedgerService.getCashFlowData(
        user.organizationId,
        periodFromParsed,
        periodToParsed
      );

      return {
        success: true,
        message: 'Cash flow data retrieved successfully',
        data: cashFlowData,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get cash flow data: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('account-balances/:accountType')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get account balances by type' })
  @ApiQuery({ name: 'asOfDate', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'Account balances retrieved successfully',
  })
  async getAccountBalancesByType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountType') accountType: AccountType,
    @Query('asOfDate') asOfDate?: string
  ) {
    try {
      const asOfDateParsed = asOfDate ? new Date(asOfDate) : undefined;

      const balances = await this.generalLedgerService.getAccountBalancesByType(
        user.organizationId,
        accountType,
        asOfDateParsed
      );

      return {
        success: true,
        message: 'Account balances retrieved successfully',
        data: {
          accountType,
          asOfDate: asOfDateParsed || new Date(),
          balances,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get account balances by type: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('validate-integrity')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Validate general ledger integrity' })
  @ApiResponse({
    status: 200,
    description: 'General ledger integrity validation completed',
  })
  async validateGeneralLedgerIntegrity(@CurrentUser() user: AuthenticatedUser) {
    try {
      const validation =
        await this.generalLedgerService.validateGeneralLedgerIntegrity(
          user.organizationId
        );

      return {
        success: true,
        message: 'General ledger integrity validation completed',
        data: validation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate general ledger integrity: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
