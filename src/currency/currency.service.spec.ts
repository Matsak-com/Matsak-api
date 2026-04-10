import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { RedisService } from '../common/providers/redis.provider';

const mockRates = {
  base: 'EUR',
  date: '2026-04-10',
  rates: {
    USD: 1.08,
    MGA: 4800,
    GBP: 0.86,
    JPY: 162.5,
  },
};

const mockAxiosResponse = {
  data: mockRates,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
};

describe('CurrencyService', () => {
  let service: CurrencyService;
  let httpService: jest.Mocked<HttpService>;
  let redisGetMock: jest.Mock;
  let redisSetMock: jest.Mock;

  beforeEach(async () => {
    redisGetMock = jest.fn().mockResolvedValue(null);
    redisSetMock = jest.fn().mockResolvedValue('OK');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn().mockReturnValue(of(mockAxiosResponse)),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: () => ({
              get: redisGetMock,
              set: redisSetMock,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
    httpService = module.get(HttpService);

    // Reset in-process memory cache between tests
    (service as any).memoryCache = null;
  });

  // ── getRates ──────────────────────────────────────────────────────────────

  describe('getRates', () => {
    it('fetches from API when no cache exists', async () => {
      const rates = await service.getRates();
      expect(rates.base).toBe('EUR');
      expect(rates.rates.MGA).toBe(4800);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('returns in-memory cache without hitting Redis or API', async () => {
      // Warm up memory cache (1 fetch)
      await service.getRates();
      // Force  fresh timestamp so memory cache is still valid
      (service as any).memoryCache.fetchedAt = Date.now();

      await service.getRates();
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(redisGetMock).toHaveBeenCalledTimes(1); // only on first call
    });

    it('returns Redis cache when available', async () => {
      const cached = JSON.stringify({ ...mockRates, fetchedAt: Date.now() });
      redisGetMock.mockResolvedValueOnce(cached);

      const rates = await service.getRates();
      expect(rates.rates.USD).toBe(1.08);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('throws when API is unavailable and no cache', async () => {
      (httpService.get as jest.Mock).mockReturnValueOnce(
        throwError(() => new Error('Network Error')),
      );

      await expect(service.getRates()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('falls back to API when Redis throws', async () => {
      redisGetMock.mockRejectedValueOnce(new Error('Redis down'));
      const rates = await service.getRates();
      expect(rates.base).toBe('EUR');
    });
  });

  // ── convert ───────────────────────────────────────────────────────────────

  describe('convert', () => {
    it('returns same amount when from === to', async () => {
      const result = await service.convert(100, 'EUR', 'EUR');
      expect(result).toBe(100);
    });

    it('converts EUR → MGA correctly', async () => {
      // 100 EUR × 4800 = 480 000 MGA
      const result = await service.convert(100, 'EUR', 'MGA');
      expect(result).toBe(480000);
    });

    it('converts USD → MGA via EUR pivot', async () => {
      // 100 USD / 1.08 EUR ≈ 92.59 EUR × 4800 ≈ 444 444.44
      const result = await service.convert(100, 'USD', 'MGA');
      expect(result).toBeCloseTo(444444.44, 0);
    });

    it('throws for unknown source currency', async () => {
      await expect(service.convert(100, 'XYZ', 'EUR')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws for unknown target currency', async () => {
      await expect(service.convert(100, 'EUR', 'XYZ')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── getEurRate ────────────────────────────────────────────────────────────

  describe('getEurRate', () => {
    it('returns 1 for EUR', async () => {
      expect(await service.getEurRate('EUR')).toBe(1);
    });

    it('returns correct rate for MGA', async () => {
      expect(await service.getEurRate('MGA')).toBe(4800);
    });

    it('is case-insensitive', async () => {
      expect(await service.getEurRate('mga')).toBe(4800);
    });
  });

  // ── listCurrencies ────────────────────────────────────────────────────────

  describe('listCurrencies', () => {
    it('includes EUR and all fetched currencies sorted', async () => {
      const list = await service.listCurrencies();
      expect(list).toContain('EUR');
      expect(list).toContain('MGA');
      expect(list).toEqual([...list].sort());
    });
  });
});
