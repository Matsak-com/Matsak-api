import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AuditAction {
  // Auth
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // CRUD
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Special
  UPLOAD = 'UPLOAD',
  EXPORT = 'EXPORT',
  IMPERSONATE = 'IMPERSONATE',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

@Schema({
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  collection: 'audit_logs',
})
export class AuditLog extends Document {
  /** The user who triggered the action (null for anonymous). */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  actorId: Types.ObjectId | null;

  @Prop({ required: false, default: null })
  actorEmail: string | null;

  @Prop({ required: false, default: null })
  actorRole: string | null;

  /** The team context at the time of the action. */
  @Prop({ type: Types.ObjectId, ref: 'Team', default: null, index: true })
  teamId: Types.ObjectId | null;

  /** High-level action category. */
  @Prop({ required: true, enum: AuditAction, index: true })
  action: AuditAction;

  /** The resource / module affected (e.g. "users", "products", "inventory"). */
  @Prop({ required: true, index: true })
  resource: string;

  /** The specific document ID affected (optional). */
  @Prop({ required: false, default: null })
  resourceId: string | null;

  /** HTTP method (GET, POST, PUT, PATCH, DELETE). */
  @Prop({ required: true })
  method: string;

  /** Full request path (e.g. /api/users/123). */
  @Prop({ required: true })
  path: string;

  /** HTTP status code returned. */
  @Prop({ required: true })
  statusCode: number;

  /** Whether the action succeeded or failed. */
  @Prop({ required: true, enum: AuditStatus, index: true })
  status: AuditStatus;

  /**
   * Sanitised snapshot of the request body.
   * Sensitive fields (password, token, secret, …) are redacted before storage.
   */
  @Prop({ type: Object, default: null })
  requestBody: Record<string, unknown> | null;

  /** Client IP address. */
  @Prop({ required: false, default: null })
  ipAddress: string | null;

  /** User-Agent header. */
  @Prop({ required: false, default: null })
  userAgent: string | null;

  /** Optional error message when status === FAILURE. */
  @Prop({ required: false, default: null })
  errorMessage: string | null;

  /** Free-form extra context attached by services. */
  @Prop({ type: Object, default: null })
  metadata: Record<string, unknown> | null;

  @Prop()
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Compound indexes for common dashboard queries
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ teamId: 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });

// TTL index – automatically purge logs older than 2 years (63072000 seconds)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export type AuditLogDocument = AuditLog & Document;
