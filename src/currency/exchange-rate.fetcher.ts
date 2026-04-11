import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../common/providers/redis.provider';
import type { ExchangeRates } from './currency.service';

export const EXCHANGERATE_BASE_URL = 'https://v6.exchangerate-api.com/v6';
export const BASE_CURRENCY = 'EUR';
export const CACHE_KEY = `currency:rates:${BASE_CURRENCY.toLowerCase()}`;

/**
 * Redis TTL is set to 25 hours — slightly longer than the 24-hour cron interval.
 * This ensures rates remain available even if a cron run is delayed or missed.
 */
export const CACHE_TTL_SECONDS = 90_000; // ~25 hours

/** Shape of the ExchangeRate-API v6 standard response */
export interface ExchangeRateApiResponse {
  result: 'success' | 'error';
  base_code: string;
  time_last_update_utc: string;
  conversion_rates: Record<string, number>;
  'error-type'?: string;
}

/**
 * Low-level service responsible for fetching exchange rates from ExchangeRate-API
 * and persisting them to Redis.
 *
 * This service has a single responsibility: produce fresh data and store it.
 * It should only be called by ExchangeRateRefreshJob (scheduled) or by
 * CurrencyService as a cold-start fallback.
 */
@Injectable()
export class ExchangeRateFetcher {
  private readonly logger = new Logger(ExchangeRateFetcher.name);
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('EXCHANGERATE_API_KEY');
    if (!key) {
      throw new Error('EXCHANGERATE_API_KEY environment variable is not set');
    }
    this.apiKey = key;
  }

  /**
   * Fetches the latest EUR-based exchange rates from ExchangeRate-API,
   * stores them in Redis, and returns the result.
   *
   * @throws InternalServerErrorException if the API call fails or returns an error
   */
  async fetchAndStore(): Promise<ExchangeRates> {
    const url = `${EXCHANGERATE_BASE_URL}/${this.apiKey}/latest/${BASE_CURRENCY}`;

    let body: ExchangeRateApiResponse;
    try {
      const response = await firstValueFrom(
        this.httpService.get<ExchangeRateApiResponse>(url, { timeout: 10_000 }),
      );
      body = response.data;
    } catch (err) {
      this.logger.error('HTTP request to ExchangeRate-API failed', err);
      throw new InternalServerErrorException(
        'Exchange rate service temporarily unavailable',
      );
    }

    if (body.result !== 'success') {
      this.logger.error(
        `ExchangeRate-API returned error: ${body['error-type']}`,
      );
      throw new InternalServerErrorException(
        `Exchange rate service error: ${body['error-type']}`,
      );
    }

    const data: ExchangeRates = {
      base: body.base_code,
      rates: body.conversion_rates,
      date: body.time_last_update_utc,
      fetchedAt: Date.now(),
    };

    try {
      await this.redisService
        .getClient()
        .set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn('Failed to persist rates to Redis', err);
    }

    this.logger.log(
      `Exchange rates stored (${Object.keys(data.rates).length} currencies, date: ${data.date})`,
    );

    return data;
  }
}
