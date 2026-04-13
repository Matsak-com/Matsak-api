import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CurrencyService } from './currency.service';
import { ExchangeRateFetcher } from './exchange-rate.fetcher';
import { ExchangeRateRefreshJob } from './exchange-rate-refresh.job';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  providers: [CurrencyService, ExchangeRateFetcher, ExchangeRateRefreshJob],
  exports: [CurrencyService],
})
export class CurrencyModule {}
