import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getRedisConfig } from '../../app.module';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const config = getRedisConfig();

    if (typeof config === 'string') {
      this.client = new Redis(config);
    } else {
      this.client = new Redis(config);
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => {});
  }
}
