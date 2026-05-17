import { SetMetadata } from '@nestjs/common';

/** Mark a route so the audit log interceptor skips it entirely. */
export const SKIP_AUDIT_LOG_KEY = 'skipAuditLog';
export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG_KEY, true);
