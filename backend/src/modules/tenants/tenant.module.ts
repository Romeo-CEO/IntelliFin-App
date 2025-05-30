import { Module } from '@nestjs/common';

import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';

import { TenantDatabaseProvider } from './providers/tenant-database.provider';

@Module({
  controllers: [TenantController],
  providers: [TenantService, TenantDatabaseProvider],
  exports: [TenantService, TenantDatabaseProvider],
})
export class TenantModule {}
