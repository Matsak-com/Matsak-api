// src/payment/guards/mvola-webhook.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class MvolaWebhookGuard implements CanActivate {
  private readonly logger = new Logger(MvolaWebhookGuard.name);
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('MVOLA_WEBHOOK_SECRET');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-mvola-signature'] as string;

    if (!signature) {
      this.logger.warn('Callback reçu sans signature');
      throw new UnauthorizedException('Signature manquante');
    }

    const payload = JSON.stringify(request.body);
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );

    if (!valid) {
      this.logger.warn('Callback reçu avec signature invalide');
      throw new UnauthorizedException('Signature invalide');
    }

    return true;
  }
}
