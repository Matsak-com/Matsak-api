import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeRateFetcher } from './exchange-rate.fetcher';
import { RedisService } from '../common/providers/redis.provider';
import { CACHE_KEY } from './exchange-rate.fetcher';

/**
 * Scheduled job that refreshes exchange rates daily at 01:00 UTC.
 *
 * On bootstrap it checks Redis: if no rates exist yet (cold start / first deploy),
 * it triggers an immediate fetch so the service is ready before any request arrives.
 */
@Injectable()
export class ExchangeRateRefreshJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExchangeRateRefreshJob.name);

  constructor(
    private readonly fetcher: ExchangeRateFetcher,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Warm up the cache on application start if Redis is empty.
   * This prevents the first real request from triggering a cold-start API call.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const existing = await this.redisService.getClient().get(CACHE_KEY);
      if (!existing) {
        this.logger.log('No cached rates found on startup — fetching now');
        await this.fetcher.fetchAndStore();
      } else {
        this.logger.log(
          'Exchange rates already cached — skipping bootstrap fetch',
        );
      }
    } catch (err) {
      // Non-fatal: the service will fall back to on-demand fetch on first request
      this.logger.warn(
        'Bootstrap rate fetch failed, will retry on next cron run',
        err,
      );
    }
  }

  /**
   * Refresh exchange rates daily at 01:00 UTC.
   * ExchangeRate-API updates its data daily, so once per day is sufficient.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'refresh-exchange-rates',
    timeZone: 'UTC',
  })
  async handleDailyRefresh(): Promise<void> {
    this.logger.log('Starting daily exchange rate refresh');
    try {
      const data = await this.fetcher.fetchAndStore();
      this.logger.log(
        `Daily exchange rate refresh complete (date: ${data.date})`,
      );
    } catch (err) {
      this.logger.error('Daily exchange rate refresh failed', err);
      // Error is logged but not re-thrown — stale data remains in Redis
      // and the job will retry on the next scheduled run
    }
  }
}
