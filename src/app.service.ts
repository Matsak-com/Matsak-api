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

    const response: any = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    };
    // Only expose database details in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      response.database = {
        status: dbStatus,
        ready: isHealthy,
      };
    }
    return response;
  }
}
