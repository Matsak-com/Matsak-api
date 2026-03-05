import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ContactDto } from './dto/contact.dto';
import { ConfigService } from '@nestjs/config';

interface ContactEmailPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}
export interface ContactEmailJob {
  dto: ContactEmailPayload;
  ip: string;
  timestamp: number;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  constructor(
    @InjectQueue('contact-emails') private readonly contactEmailQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async verifyTurnstile(token: string): Promise<boolean> {
    const secret = this.configService.get<string>('TURNSTILE_SECRET_KEY');

    if (!secret) {
      this.logger.warn(
        'TURNSTILE_SECRET_KEY not set - skipping verification in dev',
      );
      return true; // Skip en dev si pas de clé
    }

    try {
      const body = new URLSearchParams({
        secret,
        response: token,
      });

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        },
      );

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      this.logger.error('Turnstile verification failed', error);
      return false;
    }
  }

  async queueContactEmail(dto: ContactDto, ip: string): Promise<void> {
    const payload: ContactEmailPayload = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      subject: dto.subject,
      message: dto.message,
    };

    const job = {
      dto: payload,
      ip,
      timestamp: Date.now(),
    };

    await this.contactEmailQueue.add('send-contact-email', job, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }
}
