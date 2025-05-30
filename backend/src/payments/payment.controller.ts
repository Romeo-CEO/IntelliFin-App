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
import { PaymentService } from './payment.service';
import {
  BulkReconcileDto,
  CreatePaymentDto,
  PaymentListResponseDto,
  PaymentQueryDto,
  PaymentResponseDto,
  PaymentStatsDto,
  ReconcilePaymentDto,
  UpdatePaymentDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create a new payment',
    description:
      'Record a new payment from a customer, optionally linking to an invoice or transaction',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment created successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  async createPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) createPaymentDto: CreatePaymentDto
  ) {
    return await this.paymentService.createPayment(
      user.organizationId,
      user.id,
      createPaymentDto
    );
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get payments',
    description: 'Get a paginated list of payments with optional filters',
  })
  @ApiQuery({ type: PaymentQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payments retrieved successfully',
    type: PaymentListResponseDto,
  })
  async getPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: PaymentQueryDto
  ) {
    return await this.paymentService.getPayments(user.organizationId, query);
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get payment statistics',
    description:
      'Get statistical overview of payments by method and time period',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment statistics retrieved successfully',
    type: PaymentStatsDto,
  })
  async getPaymentStats(@CurrentUser() user: AuthenticatedUser) {
    return await this.paymentService.getPaymentStats(user.organizationId);
  }

  @Get('unreconciled')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get unreconciled payments',
    description: 'Get all payments that are not linked to transactions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unreconciled payments retrieved successfully',
    type: [PaymentResponseDto],
  })
  async getUnreconciledPayments(@CurrentUser() user: AuthenticatedUser) {
    return await this.paymentService.getUnreconciledPayments(
      user.organizationId
    );
  }

  @Get('reconcile')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Get reconciliation suggestions',
    description:
      'Get automatic and suggested matches between payments and transactions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reconciliation suggestions retrieved successfully',
  })
  async getReconciliationSuggestions(@CurrentUser() user: AuthenticatedUser) {
    return await this.paymentService.reconcilePayments(user.organizationId);
  }

  @Get('invoice/:invoiceId')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Get payments by invoice ID',
    description: 'Get all payments associated with a specific invoice',
  })
  @ApiParam({
    name: 'invoiceId',
    description: 'Invoice ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice payments retrieved successfully',
    type: [PaymentResponseDto],
  })
  async getPaymentsByInvoiceId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string
  ) {
    return await this.paymentService.getPaymentsByInvoiceId(
      invoiceId,
      user.organizationId
    );
  }

  @Get(':id')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Get detailed information about a specific payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment retrieved successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async getPaymentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return await this.paymentService.getPaymentById(id, user.organizationId);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Update payment',
    description: 'Update an existing payment record',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdatePaymentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment updated successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async updatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updatePaymentDto: UpdatePaymentDto
  ) {
    return await this.paymentService.updatePayment(
      id,
      user.organizationId,
      updatePaymentDto
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Delete payment',
    description: 'Delete a payment record and update related invoice status',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async deletePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.paymentService.deletePayment(id, user.organizationId);
    return { message: 'Payment deleted successfully' };
  }

  @Post(':id/reconcile')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Reconcile payment with transaction',
    description: 'Manually link a payment to a transaction for reconciliation',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: ReconcilePaymentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment reconciled successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid reconciliation data',
  })
  async reconcilePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) reconcileDto: ReconcilePaymentDto
  ) {
    return await this.paymentService.manualReconcile(
      user.organizationId,
      id,
      reconcileDto.transactionId
    );
  }

  @Post('reconcile/bulk')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Bulk reconcile payments',
    description:
      'Reconcile multiple payments with transactions in a single operation',
  })
  @ApiBody({ type: BulkReconcileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk reconciliation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 15 },
        failed: { type: 'number', example: 2 },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async bulkReconcile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) bulkReconcileDto: BulkReconcileDto
  ) {
    return await this.paymentService.bulkReconcile(
      user.organizationId,
      bulkReconcileDto.mappings
    );
  }

  @Post('reconcile/apply-automatic')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({
    summary: 'Apply automatic reconciliation matches',
    description:
      'Apply high-confidence automatic matches between payments and transactions',
  })
  @ApiBody({
    description: 'Array of automatic matches to apply',
    schema: {
      type: 'object',
      properties: {
        matches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              paymentId: { type: 'string', format: 'uuid' },
              transactionId: { type: 'string', format: 'uuid' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Automatic matches applied successfully',
    schema: {
      type: 'object',
      properties: {
        appliedCount: { type: 'number', example: 12 },
        message: { type: 'string', example: 'Applied 12 automatic matches' },
      },
    },
  })
  async applyAutomaticMatches(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { matches: any[] }
  ) {
    const appliedCount = await this.paymentService.applyAutomaticMatches(
      user.organizationId,
      body.matches
    );
    return {
      appliedCount,
      message: `Applied ${appliedCount} automatic matches`,
    };
  }
}
