import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CurrencyService } from './currency.service';
import { RedisService } from '../common/providers/redis.provider';

@Module({
  imports: [
    HttpModule.register({
      timeout: 6000,
      maxRedirects: 3,
    }),
  ],
  providers: [CurrencyService, RedisService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
