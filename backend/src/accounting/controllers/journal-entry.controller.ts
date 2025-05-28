import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JournalEntryService } from '../services/journal-entry.service';
import { CreateJournalEntryDto, UpdateJournalEntryDto, JournalEntryQueryDto, ReverseJournalEntryDto } from '../dto/journal-entry.dto';
import { JournalEntryType, SourceType, UserRole } from '@prisma/client';

@ApiTags('Journal Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/journal-entries')
export class JournalEntryController {
  private readonly logger = new Logger(JournalEntryController.name);

  constructor(private readonly journalEntryService: JournalEntryService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createJournalEntry(
    @CurrentUser() user: any,
    @Body() createJournalEntryDto: CreateJournalEntryDto
  ) {
    try {
      const journalEntry = await this.journalEntryService.createJournalEntry(
        user.organizationId,
        {
          ...createJournalEntryDto,
          createdBy: user.id,
        }
      );

      return {
        success: true,
        message: 'Journal entry created successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to create journal entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get journal entries with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entryType', required: false, enum: JournalEntryType })
  @ApiQuery({ name: 'sourceType', required: false, enum: SourceType })
  @ApiQuery({ name: 'isPosted', required: false, type: Boolean })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date })
  @ApiQuery({ name: 'dateTo', required: false, type: Date })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Journal entries retrieved successfully' })
  async getJournalEntries(
    @CurrentUser() user: any,
    @Query() query: JournalEntryQueryDto
  ) {
    try {
      const result = await this.journalEntryService.getJournalEntries(user.organizationId, query);

      return {
        success: true,
        message: 'Journal entries retrieved successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to get journal entries: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Journal entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async getJournalEntryById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      const journalEntry = await this.journalEntryService.getJournalEntryById(user.organizationId, id);

      return {
        success: true,
        message: 'Journal entry retrieved successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to get journal entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update journal entry (only if not posted)' })
  @ApiResponse({ status: 200, description: 'Journal entry updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async updateJournalEntry(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJournalEntryDto: UpdateJournalEntryDto
  ) {
    try {
      const journalEntry = await this.journalEntryService.updateJournalEntry(
        user.organizationId,
        id,
        updateJournalEntryDto
      );

      return {
        success: true,
        message: 'Journal entry updated successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to update journal entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post(':id/post')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post journal entry (make it permanent)' })
  @ApiResponse({ status: 200, description: 'Journal entry posted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async postJournalEntry(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      const postData: PostJournalEntryDto = {
        journalEntryId: id,
        postedBy: user.id,
      };

      const journalEntry = await this.journalEntryService.postJournalEntry(user.organizationId, postData);

      return {
        success: true,
        message: 'Journal entry posted successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to post journal entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post(':id/reverse')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reverse a posted journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry reversed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async reverseJournalEntry(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReverseJournalEntryDto
  ) {
    try {
      const reverseData = {
        originalEntryId: id,
        reversalDate: new Date(body.reversalDate),
        reversalReason: body.reversalReason,
        createdBy: user.id,
      };

      const reversingEntry = await this.journalEntryService.reverseJournalEntry(user.organizationId, reverseData);

      return {
        success: true,
        message: 'Journal entry reversed successfully',
        data: reversingEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to reverse journal entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete journal entry (only if not posted)' })
  @ApiResponse({ status: 200, description: 'Journal entry deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async deleteJournalEntry(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      const journalEntry = await this.journalEntryService.deleteJournalEntry(user.organizationId, id);

      return {
        success: true,
        message: 'Journal entry deleted successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to delete journal entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('from-invoice/:invoiceId')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create journal entry from invoice' })
  @ApiResponse({ status: 201, description: 'Journal entry created from invoice successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async createJournalEntryFromInvoice(
    @CurrentUser() user: any,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string
  ) {
    try {
      const journalEntry = await this.journalEntryService.createJournalEntryFromInvoice(
        user.organizationId,
        invoiceId,
        user.id
      );

      return {
        success: true,
        message: 'Journal entry created from invoice successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to create journal entry from invoice: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('from-payment/:paymentId')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create journal entry from payment' })
  @ApiResponse({ status: 201, description: 'Journal entry created from payment successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async createJournalEntryFromPayment(
    @CurrentUser() user: any,
    @Param('paymentId', ParseUUIDPipe) paymentId: string
  ) {
    try {
      const journalEntry = await this.journalEntryService.createJournalEntryFromPayment(
        user.organizationId,
        paymentId,
        user.id
      );

      return {
        success: true,
        message: 'Journal entry created from payment successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to create journal entry from payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('from-expense/:expenseId')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create journal entry from expense' })
  @ApiResponse({ status: 201, description: 'Journal entry created from expense successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async createJournalEntryFromExpense(
    @CurrentUser() user: any,
    @Param('expenseId', ParseUUIDPipe) expenseId: string
  ) {
    try {
      const journalEntry = await this.journalEntryService.createJournalEntryFromExpense(
        user.organizationId,
        expenseId,
        user.id
      );

      return {
        success: true,
        message: 'Journal entry created from expense successfully',
        data: journalEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to create journal entry from expense: ${error.message}`, error.stack);
      throw error;
    }
  }
}
