import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [
    AuditLogRepository,
    AuditLogService,
    // Register as a global interceptor so every request is captured.
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}
