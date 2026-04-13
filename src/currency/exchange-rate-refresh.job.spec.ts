import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ExchangeRateRefreshJob } from './exchange-rate-refresh.job';
import { ExchangeRateFetcher } from './exchange-rate.fetcher';
import { RedisService } from '../common/providers/redis.provider';
import type { ExchangeRates } from './currency.service';

const mockRates: ExchangeRates = {
  base: 'EUR',
  date: 'Fri, 10 Apr 2026 00:00:00 +0000',
  fetchedAt: Date.now(),
  rates: { EUR: 1, USD: 1.08, MGA: 4800 },
};

describe('ExchangeRateRefreshJob', () => {
  let job: ExchangeRateRefreshJob;
  let fetcherMock: jest.Mocked<ExchangeRateFetcher>;
  let redisGetMock: jest.Mock;

  beforeEach(async () => {
    redisGetMock = jest.fn().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateRefreshJob,
        {
          provide: ExchangeRateFetcher,
          useValue: {
            fetchAndStore: jest.fn().mockResolvedValue(mockRates),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: () => ({ get: redisGetMock }),
          },
        },
      ],
    }).compile();

    job = module.get<ExchangeRateRefreshJob>(ExchangeRateRefreshJob);
    fetcherMock = module.get(ExchangeRateFetcher);
  });

  // ── onApplicationBootstrap ────────────────────────────────────────────────

  describe('onApplicationBootstrap', () => {
    it('triggers fetchAndStore when Redis cache is empty', async () => {
      redisGetMock.mockResolvedValue(null);
      await job.onApplicationBootstrap();
      expect(fetcherMock.fetchAndStore).toHaveBeenCalledTimes(1);
    });

    it('skips fetchAndStore when Redis already has cached rates', async () => {
      redisGetMock.mockResolvedValue(JSON.stringify(mockRates));
      await job.onApplicationBootstrap();
      expect(fetcherMock.fetchAndStore).not.toHaveBeenCalled();
    });

    it('does not throw when Redis check fails (non-fatal)', async () => {
      redisGetMock.mockRejectedValueOnce(new Error('Redis unavailable'));
      // bootstrap failures are non-fatal — should not throw
      await expect(job.onApplicationBootstrap()).resolves.not.toThrow();
    });

    it('does not throw when fetchAndStore fails during bootstrap (non-fatal)', async () => {
      redisGetMock.mockResolvedValue(null);
      fetcherMock.fetchAndStore.mockRejectedValueOnce(
        new InternalServerErrorException('API down'),
      );
      await expect(job.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });

  // ── handleDailyRefresh ────────────────────────────────────────────────────

  describe('handleDailyRefresh', () => {
    it('calls fetchAndStore on each scheduled run', async () => {
      await job.handleDailyRefresh();
      expect(fetcherMock.fetchAndStore).toHaveBeenCalledTimes(1);
    });

    it('does not throw when fetchAndStore fails (keeps stale data alive)', async () => {
      fetcherMock.fetchAndStore.mockRejectedValueOnce(
        new InternalServerErrorException('API down'),
      );
      await expect(job.handleDailyRefresh()).resolves.not.toThrow();
    });

    it('can be called multiple times (idempotent)', async () => {
      await job.handleDailyRefresh();
      await job.handleDailyRefresh();
      await job.handleDailyRefresh();
      expect(fetcherMock.fetchAndStore).toHaveBeenCalledTimes(3);
    });
  });
});
