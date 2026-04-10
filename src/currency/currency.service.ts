import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../common/providers/redis.provider';

/** ECB-based rates sourced from Frankfurter.app (same data Google Finance uses) */
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=EUR';
const CACHE_KEY = 'currency:rates:eur';
const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
  fetchedAt: number; // Unix ms timestamp
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private memoryCache: ExchangeRates | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Returns the latest EUR-based exchange rates.
   * Cache hierarchy: in-process memory → Redis → Frankfurter API.
   */
  async getRates(): Promise<ExchangeRates> {
    // 1. In-process memory (avoid Redis round-trip for hot paths)
    if (
      this.memoryCache &&
      Date.now() - this.memoryCache.fetchedAt < 60_000 // 1-minute local cache
    ) {
      return this.memoryCache;
    }

    // 2. Redis cache
    try {
      const cached = await this.redisService.getClient().get(CACHE_KEY);
      if (cached) {
        const parsed: ExchangeRates = JSON.parse(cached);
        this.memoryCache = parsed;
        return parsed;
      }
    } catch (err) {
      this.logger.warn('Redis unavailable, fetching rates directly', err);
    }

    // 3. Fetch from Frankfurter.app (ECB official data)
    return this.fetchAndCache();
  }

  /**
   * Convert an amount from one currency to another.
   * @param amount   Amount to convert
   * @param from     Source ISO currency code (e.g. 'EUR')
   * @param to       Target ISO currency code (e.g. 'MGA')
   * @returns        Converted amount, rounded to 2 decimal places
   */
  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const rates = await this.getRates();

    const fromRate = from === 'EUR' ? 1 : rates.rates[from.toUpperCase()];
    const toRate = to === 'EUR' ? 1 : rates.rates[to.toUpperCase()];

    if (!fromRate) throw new InternalServerErrorException(`Unknown currency: ${from}`);
    if (!toRate) throw new InternalServerErrorException(`Unknown currency: ${to}`);

    const inEur = amount / fromRate;
    return Math.round(inEur * toRate * 100) / 100;
  }

  /**
   * Returns how many units of `currency` equal 1 EUR.
   */
  async getEurRate(currency: string): Promise<number> {
    if (currency.toUpperCase() === 'EUR') return 1;
    const rates = await this.getRates();
    const rate = rates.rates[currency.toUpperCase()];
    if (!rate) throw new InternalServerErrorException(`Unknown currency: ${currency}`);
    return rate;
  }

  /** List all available currency codes */
  async listCurrencies(): Promise<string[]> {
    const rates = await this.getRates();
    return ['EUR', ...Object.keys(rates.rates)].sort();
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async fetchAndCache(): Promise<ExchangeRates> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ base: string; rates: Record<string, number>; date: string }>(
          FRANKFURTER_URL,
          { timeout: 5000 },
        ),
      );

      const data: ExchangeRates = {
        base: response.data.base,
        rates: response.data.rates,
        date: response.data.date,
        fetchedAt: Date.now(),
      };

      // Store in Redis
      try {
        await this.redisService
          .getClient()
          .set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
      } catch (err) {
        this.logger.warn('Failed to cache rates in Redis', err);
      }

      this.memoryCache = data;
      this.logger.log(
        `Exchange rates refreshed (${Object.keys(data.rates).length} currencies, date: ${data.date})`,
      );
      return data;
    } catch (err) {
      this.logger.error('Failed to fetch exchange rates', err);
      throw new InternalServerErrorException(
        'Exchange rate service temporarily unavailable',
      );
    }
  }
}
