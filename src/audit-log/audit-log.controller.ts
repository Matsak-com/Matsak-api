import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import {
  CompoundZodValidation,
  ZodValidation,
} from '../common/decorators/zod-validation.decorator';
import { AuditLogService, AuditLogQueryDto } from './audit-log.service';
import {
  auditLogCleanupBodySchema,
  auditLogIdParamSchema,
  auditLogQuerySchema,
} from './audit-log.schemas';
import { SkipAuditLog } from './decorators/skip-audit-log.decorator';

@Controller('audit-logs')
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * GET /api/audit-logs
   * List all audit logs with filters and pagination.
   * Accessible by ADMIN and SUPERADMIN.
   */
  @Get()
  @SkipAuditLog()
  @CompoundZodValidation({ query: auditLogQuerySchema })
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }

  /**
   * GET /api/audit-logs/stats
   * Get aggregated statistics (action breakdown, top actors, daily activity).
   * Accessible by ADMIN and SUPERADMIN.
   */
  @Get('stats')
  @SkipAuditLog()
  async getStats(@Query('teamId') teamId?: string) {
    return this.auditLogService.getStats(teamId);
  }

  /**
   * GET /api/audit-logs/:id
   * Get a single audit log entry by ID.
   * Accessible by ADMIN and SUPERADMIN.
   */
  @Get(':id')
  @SkipAuditLog()
  @CompoundZodValidation({ params: auditLogIdParamSchema })
  async findOne(@Param('id') id: string) {
    const log = await this.auditLogService.findById(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  /**
   * POST /api/audit-logs/cleanup
   * Permanently delete logs older than N days.
   * SUPERADMIN only.
   */
  @Post('cleanup')
  @SkipAuditLog()
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ZodValidation(auditLogCleanupBodySchema)
  async cleanup(@Body() body: { olderThanDays: number }) {
    return this.auditLogService.cleanup(body.olderThanDays);
  }
}
