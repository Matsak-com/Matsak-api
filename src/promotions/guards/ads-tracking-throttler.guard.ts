import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard for impression/click tracking endpoints.
 * Generates a per-IP-per-ad cache key so each ad is rate-limited
 * independently per client (max 1 request per hour per IP per ad).
 */
@Injectable()
export class AdsTrackingThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip: string = (req.ips?.length ? req.ips[0] : req.ip) ?? 'unknown';
    const adId: string = req.params?.id ?? 'unknown';
    return `${ip}:${adId}`;
  }
}
