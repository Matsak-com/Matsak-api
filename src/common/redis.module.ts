import { Global, Module } from '@nestjs/common';
import { RedisService } from './providers/redis.provider';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
