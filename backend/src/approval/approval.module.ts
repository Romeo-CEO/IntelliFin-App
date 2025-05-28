import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationModule } from '../notifications/notification.module';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ApprovalRulesEngine } from './approval-rules.engine';
import { ApprovalRequestRepository } from './approval-request.repository';
import { ApprovalTaskRepository } from './approval-task.repository';

@Module({
  imports: [
    DatabaseModule,
    NotificationModule,
  ],
  controllers: [ApprovalController],
  providers: [
    ApprovalService,
    ApprovalRulesEngine,
    ApprovalRequestRepository,
    ApprovalTaskRepository,
  ],
  exports: [
    ApprovalService,
    ApprovalRulesEngine,
    ApprovalRequestRepository,
    ApprovalTaskRepository,
  ],
})
export class ApprovalModule {}
