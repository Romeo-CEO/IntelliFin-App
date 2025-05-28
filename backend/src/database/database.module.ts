import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from './prisma.service';
import { MigrationService } from './migration.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService, MigrationService],
  exports: [PrismaService, MigrationService],
})
export class DatabaseModule {}
