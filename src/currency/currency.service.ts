import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { RedisService } from '../common/providers/redis.provider';
import {
  ExchangeRateFetcher,
  CACHE_KEY,
  BASE_CURRENCY,
} from './exchange-rate.fetcher';

/** In-process TTL: avoids a Redis round-trip on every request */
const MEMORY_CACHE_TTL_MS = 60_000; // 1 minute

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
    private readonly redisService: RedisService,
    private readonly fetcher: ExchangeRateFetcher,
  ) {}

  /**
   * Returns the current EUR-based exchange rates.
   *
   * Cache hierarchy:
   *  1. In-process memory (60s TTL) — avoids Redis round-trip on hot paths
   *  2. Redis (populated by the daily cron job)
   *  3. Direct API call (cold-start fallback only — should rarely occur)
   */
  async getRates(): Promise<ExchangeRates> {
    // 1. In-process memory cache
    if (
      this.memoryCache &&
      Date.now() - this.memoryCache.fetchedAt < MEMORY_CACHE_TTL_MS
    ) {
      return this.memoryCache;
    }

    // 2. Redis (primary persistent cache — written by ExchangeRateRefreshJob)
    try {
      const cached = await this.redisService.getClient().get(CACHE_KEY);
      if (cached) {
        const parsed: ExchangeRates = JSON.parse(cached);
        this.memoryCache = parsed;
        return parsed;
      }
    } catch (err) {
      this.logger.warn('Redis unavailable, falling back to direct fetch', err);
    }

    // 3. Cold-start fallback (first boot before cron has run, or Redis failure)
    this.logger.warn(
      'No cached rates found — triggering on-demand fetch (consider checking cron health)',
    );
    const data = await this.fetcher.fetchAndStore();
    this.memoryCache = data;
    return data;
  }

  /**
   * Convert an amount from one currency to another.
   * @param amount  Amount to convert
   * @param from    Source ISO 4217 currency code (e.g. 'EUR')
   * @param to      Target ISO 4217 currency code (e.g. 'MGA')
   * @returns       Converted amount, rounded to 2 decimal places
   */
  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const rates = await this.getRates();

    const fromKey = from.toUpperCase();
    const toKey = to.toUpperCase();
    const fromRate = fromKey === BASE_CURRENCY ? 1 : rates.rates[fromKey];
    const toRate = toKey === BASE_CURRENCY ? 1 : rates.rates[toKey];

    if (!fromRate) {
      throw new InternalServerErrorException(`Unknown currency: ${from}`);
    }
    if (!toRate) {
      throw new InternalServerErrorException(`Unknown currency: ${to}`);
    }

    const inBase = amount / fromRate;
    return Math.round(inBase * toRate * 100) / 100;
  }

  /**
   * Returns how many units of `currency` equal 1 EUR.
   */
  async getEurRate(currency: string): Promise<number> {
    const key = currency.toUpperCase();
    if (key === BASE_CURRENCY) return 1;
    const rates = await this.getRates();
    const rate = rates.rates[key];
    if (!rate) {
      throw new InternalServerErrorException(`Unknown currency: ${currency}`);
    }
    return rate;
  }

  /** List all available currency codes */
  async listCurrencies(): Promise<string[]> {
    const rates = await this.getRates();
    return Object.keys(rates.rates).sort();
  }
}
