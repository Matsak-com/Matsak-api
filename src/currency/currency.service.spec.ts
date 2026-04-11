import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { CurrencyService, ExchangeRates } from './currency.service';
import { ExchangeRateFetcher } from './exchange-rate.fetcher';
import { RedisService } from '../common/providers/redis.provider';

const mockRates: ExchangeRates = {
  base: 'EUR',
  date: 'Fri, 10 Apr 2026 00:00:00 +0000',
  fetchedAt: Date.now(),
  rates: {
    EUR: 1,
    USD: 1.08,
    MGA: 4800,
    GBP: 0.86,
    JPY: 162.5,
  },
};

describe('CurrencyService', () => {
  let service: CurrencyService;
  let fetcherMock: jest.Mocked<ExchangeRateFetcher>;
  let redisGetMock: jest.Mock;

  beforeEach(async () => {
    redisGetMock = jest.fn().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
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

    service = module.get<CurrencyService>(CurrencyService);
    fetcherMock = module.get(ExchangeRateFetcher);

    // Reset in-process memory cache between tests
    (service as any).memoryCache = null;
  });

  // ── getRates ──────────────────────────────────────────────────────────────

  describe('getRates', () => {
    it('returns in-memory cache when fresh, without hitting Redis or fetcher', async () => {
      (service as any).memoryCache = { ...mockRates, fetchedAt: Date.now() };

      const rates = await service.getRates();
      expect(rates.base).toBe('EUR');
      expect(redisGetMock).not.toHaveBeenCalled();
      expect(fetcherMock.fetchAndStore).not.toHaveBeenCalled();
    });

    it('reads from Redis when memory cache is stale', async () => {
      (service as any).memoryCache = { ...mockRates, fetchedAt: 0 }; // stale
      redisGetMock.mockResolvedValueOnce(JSON.stringify(mockRates));

      const rates = await service.getRates();
      expect(rates.rates.USD).toBe(1.08);
      expect(fetcherMock.fetchAndStore).not.toHaveBeenCalled();
    });

    it('calls fetcher as fallback when Redis is empty (cold start)', async () => {
      redisGetMock.mockResolvedValue(null);

      const rates = await service.getRates();
      expect(rates.base).toBe('EUR');
      expect(fetcherMock.fetchAndStore).toHaveBeenCalledTimes(1);
    });

    it('calls fetcher as fallback when Redis throws', async () => {
      redisGetMock.mockRejectedValueOnce(new Error('Redis down'));

      const rates = await service.getRates();
      expect(rates.base).toBe('EUR');
      expect(fetcherMock.fetchAndStore).toHaveBeenCalledTimes(1);
    });

    it('throws when fetcher also fails', async () => {
      redisGetMock.mockResolvedValue(null);
      fetcherMock.fetchAndStore.mockRejectedValueOnce(
        new InternalServerErrorException('API down'),
      );

      await expect(service.getRates()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('populates memory cache from Redis result', async () => {
      redisGetMock.mockResolvedValueOnce(JSON.stringify(mockRates));
      await service.getRates();
      expect((service as any).memoryCache).not.toBeNull();
    });
  });

  // ── convert ───────────────────────────────────────────────────────────────

  describe('convert', () => {
    beforeEach(() => {
      (service as any).memoryCache = { ...mockRates, fetchedAt: Date.now() };
    });

    it('returns same amount when from === to', async () => {
      expect(await service.convert(100, 'EUR', 'EUR')).toBe(100);
    });

    it('converts EUR → MGA correctly', async () => {
      // 100 EUR × 4800 = 480 000 MGA
      expect(await service.convert(100, 'EUR', 'MGA')).toBe(480000);
    });

    it('converts MGA → EUR correctly', async () => {
      // 480 000 MGA / 4800 = 100 EUR
      expect(await service.convert(480000, 'MGA', 'EUR')).toBe(100);
    });

    it('converts USD → MGA via EUR pivot', async () => {
      // 100 USD / 1.08 ≈ 92.5926 EUR × 4800 ≈ 444 444.44
      const result = await service.convert(100, 'USD', 'MGA');
      expect(result).toBeCloseTo(444444.44, 0);
    });

    it('is case-insensitive for currency codes', async () => {
      expect(await service.convert(100, 'eur', 'mga')).toBe(480000);
    });

    it('throws InternalServerErrorException for unknown source currency', async () => {
      await expect(service.convert(100, 'XYZ', 'EUR')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException for unknown target currency', async () => {
      await expect(service.convert(100, 'EUR', 'XYZ')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── getEurRate ────────────────────────────────────────────────────────────

  describe('getEurRate', () => {
    beforeEach(() => {
      (service as any).memoryCache = { ...mockRates, fetchedAt: Date.now() };
    });

    it('returns 1 for EUR without fetching rates', async () => {
      expect(await service.getEurRate('EUR')).toBe(1);
      expect(fetcherMock.fetchAndStore).not.toHaveBeenCalled();
    });

    it('returns correct rate for MGA', async () => {
      expect(await service.getEurRate('MGA')).toBe(4800);
    });

    it('is case-insensitive', async () => {
      expect(await service.getEurRate('mga')).toBe(4800);
    });

    it('throws for unknown currency', async () => {
      await expect(service.getEurRate('ZZZ')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── listCurrencies ────────────────────────────────────────────────────────

  describe('listCurrencies', () => {
    it('returns all currencies sorted alphabetically', async () => {
      (service as any).memoryCache = { ...mockRates, fetchedAt: Date.now() };
      const list = await service.listCurrencies();
      expect(list).toContain('MGA');
      expect(list).toContain('USD');
      expect(list).toEqual([...list].sort());
    });
  });
});
