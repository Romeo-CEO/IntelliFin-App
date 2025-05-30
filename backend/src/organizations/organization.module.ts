import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { ZraTinValidator } from './validators/zra-tin.validator';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository, ZraTinValidator],
  exports: [OrganizationService, OrganizationRepository],
})
export class OrganizationModule {}
