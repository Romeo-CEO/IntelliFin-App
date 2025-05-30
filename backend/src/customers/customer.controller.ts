import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CustomerService } from './customer.service';
import { CustomerImportExportService } from './customer-import-export.service';
import {
  CreateCustomerDto,
  CustomerListResponseDto,
  CustomerQueryDto,
  CustomerResponseDto,
  CustomerStatsDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly customerImportExportService: CustomerImportExportService
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create a new customer',
    description: 'Create a new customer for the authenticated organization',
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Customer with email or ZRA TIN already exists',
  })
  async createCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) createCustomerDto: CreateCustomerDto
  ) {
    return await this.customerService.createCustomer(
      user.organizationId,
      createCustomerDto
    );
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get customers',
    description: 'Get a paginated list of customers with optional filters',
  })
  @ApiQuery({ type: CustomerQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customers retrieved successfully',
    type: CustomerListResponseDto,
  })
  async getCustomers(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: CustomerQueryDto
  ) {
    return await this.customerService.getCustomers(user.organizationId, query);
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get customer statistics',
    description: 'Get statistical overview of customers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer statistics retrieved successfully',
    type: CustomerStatsDto,
  })
  async getCustomerStats(@CurrentUser() user: AuthenticatedUser) {
    return await this.customerService.getCustomerStats(user.organizationId);
  }

  @Get('search')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Search customers',
    description:
      'Search customers by name, email, or phone for quick selection',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search term',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: [CustomerResponseDto],
  })
  async searchCustomers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number
  ) {
    return await this.customerService.searchCustomers(
      user.organizationId,
      searchTerm,
      limit ? parseInt(limit.toString()) : 10
    );
  }

  @Get('select-options')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get customers for select dropdown',
    description: 'Get simplified customer list for dropdown/select components',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer options retrieved successfully',
  })
  async getCustomersForSelect(@CurrentUser() user: AuthenticatedUser) {
    return await this.customerService.getCustomersForSelect(
      user.organizationId
    );
  }

  @Get(':id')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Get customer by ID',
    description: 'Get detailed information about a specific customer',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'includeStats',
    description:
      'Include customer statistics (invoice count, payment count, etc.)',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer retrieved successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async getCustomerById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeStats') includeStats?: boolean
  ) {
    if (includeStats) {
      return await this.customerService.getCustomerByIdWithStats(
        id,
        user.organizationId
      );
    }
    return await this.customerService.getCustomerById(id, user.organizationId);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Update customer',
    description: 'Update an existing customer',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer updated successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Customer with email or ZRA TIN already exists',
  })
  async updateCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCustomerDto: UpdateCustomerDto
  ) {
    return await this.customerService.updateCustomer(
      id,
      user.organizationId,
      updateCustomerDto
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Delete customer',
    description: 'Delete a customer (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete customer with associated records',
  })
  async deleteCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.customerService.deleteCustomer(id, user.organizationId);
    return { message: 'Customer deleted successfully' };
  }

  @Post('import')
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import customers from CSV',
    description: 'Import customers from a CSV file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file containing customer data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        skipDuplicates: {
          type: 'boolean',
          description: 'Skip duplicate customers',
          default: true,
        },
        updateExisting: {
          type: 'boolean',
          description: 'Update existing customers',
          default: false,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or data format',
  })
  async importCustomers(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('skipDuplicates') skipDuplicates?: boolean,
    @Body('updateExisting') updateExisting?: boolean
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV file');
    }

    const csvData = file.buffer.toString('utf-8');
    return await this.customerImportExportService.importCustomersFromCsv(
      user.organizationId,
      csvData,
      { skipDuplicates, updateExisting }
    );
  }

  @Get('export/csv')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="customers.csv"')
  @ApiOperation({
    summary: 'Export customers to CSV',
    description: 'Export customers to a CSV file',
  })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive customers',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file generated successfully',
    headers: {
      'Content-Type': {
        description: 'MIME type of the response',
        schema: { type: 'string', example: 'text/csv' },
      },
      'Content-Disposition': {
        description: 'Attachment filename',
        schema: {
          type: 'string',
          example: 'attachment; filename="customers.csv"',
        },
      },
    },
  })
  async exportCustomersCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive') includeInactive?: boolean,
    @Res() res: Response
  ) {
    const csvData = await this.customerImportExportService.exportCustomersToCsv(
      user.organizationId,
      { format: 'csv', includeInactive }
    );

    const filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  }

  @Get('export/json')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiOperation({
    summary: 'Export customers to JSON',
    description: 'Export customers to JSON format',
  })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive customers',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'JSON data generated successfully',
  })
  async exportCustomersJson(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive') includeInactive?: boolean
  ) {
    return await this.customerImportExportService.exportCustomersToJson(
      user.organizationId,
      { format: 'json', includeInactive }
    );
  }

  @Get('import/template')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="customer_import_template.csv"'
  )
  @ApiOperation({
    summary: 'Download CSV import template',
    description: 'Download a CSV template for importing customers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV template generated successfully',
    headers: {
      'Content-Type': {
        description: 'MIME type of the response',
        schema: { type: 'string', example: 'text/csv' },
      },
      'Content-Disposition': {
        description: 'Attachment filename',
        schema: {
          type: 'string',
          example: 'attachment; filename="customer_import_template.csv"',
        },
      },
    },
  })
  async downloadImportTemplate(@Res() res: Response) {
    const template = this.customerImportExportService.generateImportTemplate();
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="customer_import_template.csv"'
    );
    res.send(template);
  }
}
