import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { AccountService } from '../services/account.service';
import {
  AccountQueryDto,
  CreateAccountDto,
  InitializeChartOfAccountsDto,
  UpdateAccountDto,
} from '../dto/account.dto';
import { AccountType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

@ApiTags('Chart of Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/accounts')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(private readonly accountService: AccountService) {}

  @Post('initialize')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialize chart of accounts for organization' })
  @ApiResponse({
    status: 201,
    description: 'Chart of accounts initialized successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async initializeChartOfAccounts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: InitializeChartOfAccountsDto
  ) {
    try {
      const data = {
        organizationId: user.organizationId,
        includeDefaultAccounts: body.includeDefaultAccounts ?? true,
      };

      const accounts =
        await this.accountService.initializeChartOfAccounts(data);

      return {
        success: true,
        message: 'Chart of accounts initialized successfully',
        data: {
          accountsCreated: accounts.length,
          accounts: accounts.map(account => ({
            id: account.id,
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType,
          })),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialize chart of accounts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createAccountDto: CreateAccountDto
  ) {
    try {
      const account = await this.accountService.createAccount(
        user.organizationId,
        createAccountDto
      );

      return {
        success: true,
        message: 'Account created successfully',
        data: account,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create account: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get accounts with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'accountType', required: false, enum: AccountType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  async getAccounts(@CurrentUser() user: AuthenticatedUser, @Query() query: AccountQueryDto) {
    try {
      const result = await this.accountService.getAccounts(
        user.organizationId,
        query
      );

      return {
        success: true,
        message: 'Accounts retrieved successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get accounts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('hierarchy')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get account hierarchy' })
  @ApiQuery({ name: 'accountType', required: false, enum: AccountType })
  @ApiResponse({
    status: 200,
    description: 'Account hierarchy retrieved successfully',
  })
  async getAccountHierarchy(
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountType') accountType?: AccountType
  ) {
    try {
      const hierarchy = await this.accountService.getAccountHierarchy(
        user.organizationId,
        accountType
      );

      return {
        success: true,
        message: 'Account hierarchy retrieved successfully',
        data: hierarchy,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get account hierarchy: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('summary')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get account summary statistics' })
  @ApiResponse({
    status: 200,
    description: 'Account summary retrieved successfully',
  })
  async getAccountSummary(@CurrentUser() user: AuthenticatedUser) {
    try {
      const summary = await this.accountService.getAccountSummary(
        user.organizationId
      );

      return {
        success: true,
        message: 'Account summary retrieved successfully',
        data: summary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get account summary: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('by-type/:accountType')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get accounts by type' })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  async getAccountsByType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountType') accountType: AccountType
  ) {
    try {
      const accounts = await this.accountService.getAccountsByType(
        user.organizationId,
        accountType
      );

      return {
        success: true,
        message: 'Accounts retrieved successfully',
        data: accounts,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get accounts by type: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('bank-accounts')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get bank accounts' })
  @ApiResponse({
    status: 200,
    description: 'Bank accounts retrieved successfully',
  })
  async getBankAccounts(@CurrentUser() user: AuthenticatedUser) {
    try {
      const accounts = await this.accountService.getBankAccounts(
        user.organizationId
      );

      return {
        success: true,
        message: 'Bank accounts retrieved successfully',
        data: accounts,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get bank accounts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get('tax-accounts')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get tax accounts' })
  @ApiResponse({
    status: 200,
    description: 'Tax accounts retrieved successfully',
  })
  async getTaxAccounts(@CurrentUser() user: AuthenticatedUser) {
    try {
      const accounts = await this.accountService.getTaxAccounts(
        user.organizationId
      );

      return {
        success: true,
        message: 'Tax accounts retrieved successfully',
        data: accounts,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get tax accounts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.MANAGER,
    UserRole.USER,
    UserRole.VIEWER
  )
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, description: 'Account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccountById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      const account = await this.accountService.getAccountById(
        user.organizationId,
        id
      );

      return {
        success: true,
        message: 'Account retrieved successfully',
        data: account,
      };
    } catch (error) {
      this.logger.error(`Failed to get account: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update account' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async updateAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAccountDto: UpdateAccountDto
  ) {
    try {
      const account = await this.accountService.updateAccount(
        user.organizationId,
        id,
        updateAccountDto
      );

      return {
        success: true,
        message: 'Account updated successfully',
        data: account,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update account: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      const account = await this.accountService.deleteAccount(
        user.organizationId,
        id
      );

      return {
        success: true,
        message: 'Account deleted successfully',
        data: account,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete account: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
