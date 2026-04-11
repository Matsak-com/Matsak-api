import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CurrencyService } from './currency.service';
import { ExchangeRateFetcher } from './exchange-rate.fetcher';
import { ExchangeRateRefreshJob } from './exchange-rate-refresh.job';
import { RedisService } from '../common/providers/redis.provider';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  providers: [CurrencyService, ExchangeRateFetcher, ExchangeRateRefreshJob, RedisService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
