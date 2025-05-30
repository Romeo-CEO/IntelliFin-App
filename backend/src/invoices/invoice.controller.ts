import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { InvoiceService } from './invoice.service';
import {
  CreateInvoiceDto,
  InvoiceListResponseDto,
  InvoiceQueryDto,
  InvoiceResponseDto,
  InvoiceStatsDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create a new invoice',
    description:
      'Create a new invoice with automatic VAT calculations and invoice number generation',
  })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invoice created successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  async createInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) createInvoiceDto: CreateInvoiceDto
  ) {
    return await this.invoiceService.createInvoice(
      user.organizationId,
      user.id,
      createInvoiceDto
    );
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get invoices',
    description: 'Get a paginated list of invoices with optional filters',
  })
  @ApiQuery({ type: InvoiceQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoices retrieved successfully',
    type: InvoiceListResponseDto,
  })
  async getInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: InvoiceQueryDto
  ) {
    return await this.invoiceService.getInvoices(user.organizationId, query);
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get invoice statistics',
    description: 'Get statistical overview of invoices',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice statistics retrieved successfully',
    type: InvoiceStatsDto,
  })
  async getInvoiceStats(@CurrentUser() user: AuthenticatedUser) {
    return await this.invoiceService.getInvoiceStats(user.organizationId);
  }

  @Get('overdue')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get overdue invoices',
    description: 'Get all overdue invoices for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overdue invoices retrieved successfully',
    type: [InvoiceResponseDto],
  })
  async getOverdueInvoices(@CurrentUser() user: AuthenticatedUser) {
    return await this.invoiceService.getOverdueInvoices(user.organizationId);
  }

  @Get(':id')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Get invoice by ID',
    description: 'Get detailed information about a specific invoice',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice retrieved successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invoice not found',
  })
  async getInvoiceById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return await this.invoiceService.getInvoiceById(id, user.organizationId);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Update invoice',
    description: 'Update an existing invoice',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice updated successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invoice not found',
  })
  async updateInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateInvoiceDto: UpdateInvoiceDto
  ) {
    return await this.invoiceService.updateInvoice(
      id,
      user.organizationId,
      updateInvoiceDto
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Delete invoice',
    description: 'Delete an invoice (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invoice not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete invoice (e.g., already paid)',
  })
  async deleteInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.invoiceService.deleteInvoice(id, user.organizationId);
    return { message: 'Invoice deleted successfully' };
  }

  @Post(':id/send')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Send invoice to customer',
    description: 'Send invoice to customer and update status to SENT',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice sent successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invoice cannot be sent (e.g., not in draft status)',
  })
  async sendInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return await this.invoiceService.sendInvoice(id, user.organizationId);
  }

  @Post(':id/submit-zra')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Submit invoice to ZRA',
    description: 'Submit invoice to ZRA Smart Invoice system for compliance',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    description: 'Organization ZRA TIN',
    schema: {
      type: 'object',
      properties: {
        organizationTin: {
          type: 'string',
          description: 'Organization ZRA TIN',
          example: '1234567890',
        },
      },
      required: ['organizationTin'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice submitted to ZRA successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invoice cannot be submitted to ZRA',
  })
  async submitToZra(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('organizationTin') organizationTin: string
  ) {
    return await this.invoiceService.submitToZra(
      id,
      user.organizationId,
      organizationTin
    );
  }

  @Patch(':id/payment')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Record payment for invoice',
    description:
      'Record a payment for an invoice and update status accordingly',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    description: 'Payment information',
    schema: {
      type: 'object',
      properties: {
        paidAmount: {
          type: 'number',
          description: 'Amount paid',
          example: 1000.0,
          minimum: 0.01,
        },
        paymentDate: {
          type: 'string',
          format: 'date',
          description: 'Payment date (optional, defaults to current date)',
          example: '2024-01-15',
        },
      },
      required: ['paidAmount'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment recorded successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment amount',
  })
  async recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() paymentData: { paidAmount: number; paymentDate?: string }
  ) {
    const paymentDate = paymentData.paymentDate
      ? new Date(paymentData.paymentDate)
      : undefined;
    return await this.invoiceService.markAsPaid(
      id,
      user.organizationId,
      paymentData.paidAmount,
      paymentDate
    );
  }

  @Post('update-overdue')
  @Throttle({ default: { limit: 1, ttl: 300000 } }) // 1 request per 5 minutes
  @ApiOperation({
    summary: 'Update overdue invoices',
    description: 'Update status of overdue invoices (batch operation)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overdue invoices updated successfully',
    schema: {
      type: 'object',
      properties: {
        updatedCount: {
          type: 'number',
          description: 'Number of invoices updated',
          example: 5,
        },
        message: {
          type: 'string',
          description: 'Success message',
          example: 'Updated 5 overdue invoices',
        },
      },
    },
  })
  async updateOverdueInvoices(@CurrentUser() user: AuthenticatedUser) {
    const updatedCount = await this.invoiceService.updateOverdueInvoices(
      user.organizationId
    );
    return {
      updatedCount,
      message: `Updated ${updatedCount} overdue invoices`,
    };
  }
}
