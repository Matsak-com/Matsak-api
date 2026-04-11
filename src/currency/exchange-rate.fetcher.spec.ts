import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';
import {
  ExchangeRateFetcher,
  ExchangeRateApiResponse,
  CACHE_KEY,
  CACHE_TTL_SECONDS,
} from './exchange-rate.fetcher';
import { RedisService } from '../common/providers/redis.provider';

const mockApiResponse: ExchangeRateApiResponse = {
  result: 'success',
  base_code: 'EUR',
  time_last_update_utc: 'Fri, 10 Apr 2026 00:00:00 +0000',
  conversion_rates: {
    EUR: 1,
    USD: 1.08,
    MGA: 4800,
    GBP: 0.86,
  },
};

describe('ExchangeRateFetcher', () => {
  let fetcher: ExchangeRateFetcher;
  let httpGetMock: jest.Mock;
  let redisSetMock: jest.Mock;

  beforeEach(async () => {
    httpGetMock = jest
      .fn()
      .mockReturnValue(of({ data: mockApiResponse, status: 200 }));
    redisSetMock = jest.fn().mockResolvedValue('OK');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateFetcher,
        {
          provide: HttpService,
          useValue: { get: httpGetMock },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: () => ({ set: redisSetMock }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    fetcher = module.get<ExchangeRateFetcher>(ExchangeRateFetcher);
  });

  describe('constructor', () => {
    it('throws on missing EXCHANGERATE_API_KEY', async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            ExchangeRateFetcher,
            { provide: HttpService, useValue: {} },
            { provide: RedisService, useValue: {} },
            {
              provide: ConfigService,
              useValue: { get: jest.fn().mockReturnValue(undefined) },
            },
          ],
        }).compile(),
      ).rejects.toThrow('EXCHANGERATE_API_KEY');
    });
  });

  describe('fetchAndStore', () => {
    it('fetches from the correct URL with the configured API key', async () => {
      await fetcher.fetchAndStore();
      const [url] = httpGetMock.mock.calls[0];
      expect(url).toContain('test-api-key');
      expect(url).toContain('/latest/EUR');
    });

    it('returns a well-formed ExchangeRates object', async () => {
      const result = await fetcher.fetchAndStore();
      expect(result.base).toBe('EUR');
      expect(result.rates.MGA).toBe(4800);
      expect(result.date).toBe(mockApiResponse.time_last_update_utc);
      expect(result.fetchedAt).toBeLessThanOrEqual(Date.now());
    });

    it('stores the result in Redis with correct TTL', async () => {
      await fetcher.fetchAndStore();
      expect(redisSetMock).toHaveBeenCalledTimes(1);
      const [key, , exFlag, ttl] = redisSetMock.mock.calls[0];
      expect(key).toBe(CACHE_KEY);
      expect(exFlag).toBe('EX');
      expect(ttl).toBe(CACHE_TTL_SECONDS);
    });

    it('stores valid JSON in Redis', async () => {
      await fetcher.fetchAndStore();
      const stored = redisSetMock.mock.calls[0][1];
      const parsed = JSON.parse(stored);
      expect(parsed.base).toBe('EUR');
      expect(parsed.rates.USD).toBe(1.08);
    });

    it('throws InternalServerErrorException when HTTP request fails', async () => {
      httpGetMock.mockReturnValueOnce(
        throwError(() => new Error('Network Error')),
      );

      await expect(fetcher.fetchAndStore()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when API returns error result', async () => {
      const errorResponse: ExchangeRateApiResponse = {
        result: 'error',
        base_code: '',
        time_last_update_utc: '',
        conversion_rates: {},
        'error-type': 'invalid-key',
      };
      httpGetMock.mockReturnValueOnce(of({ data: errorResponse, status: 200 }));

      await expect(fetcher.fetchAndStore()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('still returns data when Redis write fails', async () => {
      redisSetMock.mockRejectedValueOnce(new Error('Redis write error'));

      const result = await fetcher.fetchAndStore();
      // Data should still be returned despite Redis failure
      expect(result.rates.MGA).toBe(4800);
    });
  });
});
