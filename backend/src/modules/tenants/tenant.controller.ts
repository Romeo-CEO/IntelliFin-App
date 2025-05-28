import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto } from './dto/tenant.dto';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant with slug or ZRA TIN already exists',
  })
  public async createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.createTenant(createTenantDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant found',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  public async getTenantById(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get tenant by slug' })
  @ApiParam({ name: 'slug', description: 'Tenant slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant found',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  public async getTenantBySlug(@Param('slug') slug: string) {
    return this.tenantService.getTenantBySlug(slug);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  public async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantService.updateTenant(id, updateTenantDto);
  }

  @Put(':id/suspend')
  @ApiOperation({ summary: 'Suspend tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant suspended successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  public async suspendTenant(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.tenantService.suspendTenant(id, reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  public async deleteTenant(@Param('id') id: string) {
    return this.tenantService.deleteTenant(id);
  }

  @Get(':id/schema/exists')
  @ApiOperation({ summary: 'Check if tenant schema exists' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Schema existence status',
  })
  public async checkSchemaExists(@Param('id') id: string) {
    const exists = await this.tenantService.tenantSchemaExists(id);
    return { exists };
  }
}
