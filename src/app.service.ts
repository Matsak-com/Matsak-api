import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    const dbStatus =
      this.connection.readyState === 1 ? 'connected' : 'disconnected';
    const isHealthy = this.connection.readyState === 1;

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        ready: isHealthy,
      },
    };
  }
}
