import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ReceiptQueryDto, ReceiptService } from './receipt.service';
import {
  ReceiptListResponseDto,
  ReceiptResponseDto,
  ReceiptStatsResponseDto,
} from './dto/receipt-response.dto';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post('upload/:expenseId')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 uploads per minute
  @ApiOperation({
    summary: 'Upload receipt for expense',
    description:
      'Upload a receipt file (image or PDF) and attach it to an expense',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'expenseId',
    description: 'Expense ID to attach receipt to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Receipt file upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Receipt file (image or PDF)',
        },
        generateThumbnail: {
          type: 'boolean',
          description: 'Generate thumbnail for image files',
          default: true,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Receipt uploaded successfully',
    type: ReceiptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or expense not found',
  })
  async uploadReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('expenseId') expenseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('generateThumbnail') generateThumbnail?: boolean
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return await this.receiptService.createReceipt(
      user.organizationId,
      user.id,
      {
        expenseId,
        file: {
          buffer: file.buffer,
          originalName: file.originalname,
          mimetype: file.mimetype,
        },
        generateThumbnail: generateThumbnail ?? true,
      }
    );
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get receipts',
    description: 'Get a paginated list of receipts with optional filters',
  })
  @ApiQuery({ type: ReceiptQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipts retrieved successfully',
    type: ReceiptListResponseDto,
  })
  async getReceipts(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: ReceiptQueryDto
  ) {
    return await this.receiptService.getReceipts(user.organizationId, query);
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get receipt statistics',
    description: 'Get comprehensive receipt statistics and analytics',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Start date for statistics (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'End date for statistics (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipt statistics retrieved successfully',
    type: ReceiptStatsResponseDto,
  })
  async getReceiptStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return await this.receiptService.getReceiptStats(
      user.organizationId,
      dateFrom,
      dateTo
    );
  }

  @Get('expense/:expenseId')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get receipts for expense',
    description: 'Get all receipts attached to a specific expense',
  })
  @ApiParam({
    name: 'expenseId',
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipts retrieved successfully',
    type: [ReceiptResponseDto],
  })
  async getReceiptsByExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('expenseId') expenseId: string
  ) {
    return await this.receiptService.getReceiptsByExpenseId(
      expenseId,
      user.organizationId
    );
  }

  @Get(':id')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get receipt by ID',
    description: 'Get detailed information about a specific receipt',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipt retrieved successfully',
    type: ReceiptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Receipt not found',
  })
  async getReceiptById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return await this.receiptService.getReceiptById(id, user.organizationId);
  }

  @Get(':id/url')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get receipt file URL',
    description: 'Get a secure URL to access the receipt file',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipt URL retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Secure URL to access the receipt file',
        },
      },
    },
  })
  async getReceiptUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const url = await this.receiptService.getReceiptUrl(
      id,
      user.organizationId
    );
    return { url };
  }

  @Get(':id/thumbnail')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get receipt thumbnail URL',
    description: 'Get a secure URL to access the receipt thumbnail',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipt thumbnail URL retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        thumbnailUrl: {
          type: 'string',
          description: 'Secure URL to access the receipt thumbnail',
          nullable: true,
        },
      },
    },
  })
  async getReceiptThumbnailUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const thumbnailUrl = await this.receiptService.getReceiptThumbnailUrl(
      id,
      user.organizationId
    );
    return { thumbnailUrl };
  }

  @Get(':id/download')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 downloads per minute
  @ApiOperation({
    summary: 'Download receipt file',
    description: 'Download the original receipt file',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipt file downloaded successfully',
  })
  async downloadReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const { buffer, fileName, contentType } =
      await this.receiptService.downloadReceipt(id, user.organizationId);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(buffer);
  }

  @Get(':id/ocr')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get receipt OCR data',
    description: 'Get OCR processing results for a receipt',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OCR data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        ocrStatus: {
          type: 'string',
          enum: ['PENDING', 'COMPLETED', 'FAILED'],
        },
        ocrText: {
          type: 'string',
          description: 'Raw OCR text',
          nullable: true,
        },
        ocrData: {
          type: 'object',
          description: 'Structured OCR data',
          nullable: true,
        },
        ocrProcessedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
      },
    },
  })
  async getReceiptOcrData(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return await this.receiptService.getReceiptOcrData(id, user.organizationId);
  }

  @Post(':id/reprocess-ocr')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Reprocess receipt OCR',
    description: 'Reprocess OCR for a receipt',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OCR reprocessing started successfully',
    type: ReceiptResponseDto,
  })
  async reprocessOcr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return await this.receiptService.reprocessOcr(id, user.organizationId);
  }

  @Get(':id/suggestions')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get expense update suggestions',
    description: 'Get suggested expense updates based on OCR data',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'object',
          properties: {
            vendor: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string' },
            description: { type: 'string' },
          },
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-1)',
        },
      },
    },
  })
  async getExpenseUpdateSuggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return await this.receiptService.suggestExpenseUpdates(
      id,
      user.organizationId
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Delete receipt',
    description: 'Delete a receipt and its associated files',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Receipt deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Receipt not found',
  })
  async deleteReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    await this.receiptService.deleteReceipt(id, user.organizationId);
  }
}
