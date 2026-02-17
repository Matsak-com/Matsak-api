import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    // Incrémenter le compteur Redis
    const current = await this.redis.incr(key);

    // Définir l'expiration si première requête
    if (current === 1) {
      await this.redis.pexpire(key, ttl * 1000);
    }

    // Obtenir le TTL restant en millisecondes
    let timeToExpire = await this.redis.pttl(key);
    if (timeToExpire < 0) timeToExpire = 0;

    // Déterminer si bloqué
    const isBlocked = current > limit;

    // Durée de blocage en millisecondes (si bloqué)
    const timeToBlockExpire = isBlocked ? blockDuration * 1000 : 0;

    return {
      totalHits: current,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
