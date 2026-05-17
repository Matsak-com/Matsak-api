import { Injectable } from '@nestjs/common';
import { FilterQuery, Types } from 'mongoose';
import { AuditLogRepository } from './audit-log.repository';
import {
  AuditAction,
  AuditLog,
  AuditLogDocument,
  AuditStatus,
} from './audit-log.schema';

/** Fields that must never be stored in audit logs. */
const SENSITIVE_KEYS = new Set([
  'password',
  'password_confirmation',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'creditCard',
  'cardNumber',
  'cvv',
  'resetPasswordToken',
  'resetPasswordTokenHash',
]);

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => sanitize(v, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = sanitize(value, depth + 1);
    }
  }
  return result;
}

export interface CreateAuditLogDto {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  teamId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  method: string;
  path: string;
  statusCode: number;
  status: AuditStatus;
  requestBody?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogQueryDto {
  page?: number;
  limit?: number;
  actorId?: string;
  actorRole?: string;
  action?: AuditAction;
  resource?: string;
  status?: AuditStatus;
  teamId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Persist an audit log entry.
   * Fire-and-forget: errors are swallowed to never block the main flow.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const sanitisedBody = dto.requestBody
        ? (sanitize(dto.requestBody) as Record<string, unknown>)
        : null;

      await this.auditLogRepository.create({
        actorId: dto.actorId ? new Types.ObjectId(dto.actorId) : null,
        actorEmail: dto.actorEmail ?? null,
        actorRole: dto.actorRole ?? null,
        teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : null,
        action: dto.action,
        resource: dto.resource,
        resourceId: dto.resourceId ?? null,
        method: dto.method,
        path: dto.path,
        statusCode: dto.statusCode,
        status: dto.status,
        requestBody: sanitisedBody,
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ? dto.userAgent.substring(0, 500) : null,
        errorMessage: dto.errorMessage ?? null,
        metadata: dto.metadata ?? null,
      } as Partial<AuditLogDocument>);
    } catch {
      // Logging must never break the application
    }
  }

  async findAll(query: AuditLogQueryDto) {
    const filter: FilterQuery<AuditLog> = {};

    if (query.actorId && Types.ObjectId.isValid(query.actorId)) {
      filter.actorId = new Types.ObjectId(query.actorId);
    }
    if (query.actorRole) {
      filter.actorRole = query.actorRole;
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.resource) {
      filter.resource = query.resource;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.teamId && Types.ObjectId.isValid(query.teamId)) {
      filter.teamId = new Types.ObjectId(query.teamId);
    }
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    return this.auditLogRepository.findPaginated({
      filter,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    });
  }

  async findById(id: string) {
    return this.auditLogRepository.findById(id);
  }

  async getStats(teamId?: string) {
    return this.auditLogRepository.getStats(teamId);
  }

  async cleanup(olderThanDays: number): Promise<{ deleted: number }> {
    const date = new Date();
    date.setDate(date.getDate() - olderThanDays);
    const deleted = await this.auditLogRepository.deleteOlderThan(date);
    return { deleted };
  }
}
