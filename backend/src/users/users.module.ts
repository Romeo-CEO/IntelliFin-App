import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
