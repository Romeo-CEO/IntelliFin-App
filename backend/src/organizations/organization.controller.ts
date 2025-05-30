import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { OrganizationService } from './organization.service';
import {
  CreateOrganizationDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new organization',
    description:
      'Creates a new organization with business information and ZRA TIN validation',
  })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or ZRA TIN format',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Organization with this ZRA TIN already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() user: any
  ): Promise<OrganizationResponseDto> {
    this.logger.log(`Creating organization for user: ${user.id}`);
    return this.organizationService.create(createOrganizationDto);
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Retrieves organization details by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<OrganizationResponseDto> {
    this.logger.log(`Finding organization by ID: ${id}`);
    return this.organizationService.findById(id);
  }

  @Get('zra-tin/:zraTin')
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get organization by ZRA TIN',
    description: 'Retrieves organization details by ZRA TIN',
  })
  @ApiParam({
    name: 'zraTin',
    description: 'ZRA Tax Identification Number',
    type: 'string',
    example: '4567890123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async findByZraTin(
    @Param('zraTin') zraTin: string
  ): Promise<OrganizationResponseDto> {
    this.logger.log(`Finding organization by ZRA TIN: ${zraTin}`);
    return this.organizationService.findByZraTin(zraTin);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update organization',
    description: 'Updates organization information (ZRA TIN cannot be changed)',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: any
  ): Promise<OrganizationResponseDto> {
    this.logger.log(`Updating organization ${id} by user: ${user.id}`);
    return this.organizationService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Soft deletes an organization (sets deletedAt timestamp)',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any
  ): Promise<void> {
    this.logger.log(`Deleting organization ${id} by user: ${user.id}`);
    return this.organizationService.delete(id);
  }

  @Get('validate/zra-tin/:zraTin')
  @Roles(UserRole.TENANT_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Validate ZRA TIN availability',
    description: 'Checks if a ZRA TIN is valid and available for use',
  })
  @ApiParam({
    name: 'zraTin',
    description: 'ZRA Tax Identification Number to validate',
    type: 'string',
    example: '4567890123',
  })
  @ApiQuery({
    name: 'excludeId',
    description: 'Organization ID to exclude from validation (for updates)',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ZRA TIN validation result',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        isAvailable: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async validateZraTin(
    @Param('zraTin') zraTin: string,
    @Query('excludeId') excludeId?: string
  ): Promise<{ isValid: boolean; isAvailable: boolean; message: string }> {
    this.logger.log(`Validating ZRA TIN: ${zraTin}`);

    const isAvailable =
      await this.organizationService.validateZraTinAvailability(
        zraTin,
        excludeId
      );

    return {
      isValid: true, // If we reach here, format is valid
      isAvailable,
      message: isAvailable
        ? 'ZRA TIN is valid and available'
        : 'ZRA TIN is already in use by another organization',
    };
  }

  @Get('options/business-types')
  @ApiOperation({
    summary: 'Get business type options',
    description: 'Returns available business types for Zambian organizations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business type options retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  })
  async getBusinessTypeOptions() {
    return this.organizationService.getBusinessTypeOptions();
  }

  @Get('options/industries')
  @ApiOperation({
    summary: 'Get industry options',
    description: 'Returns available industry sectors for Zambian organizations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Industry options retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  })
  async getIndustryOptions() {
    return this.organizationService.getIndustryOptions();
  }
}
