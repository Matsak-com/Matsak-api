import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ContactDto } from './dto/contact.dto';
import { ConfigService } from '@nestjs/config';

export interface ContactEmailJob {
  dto: ContactDto;
  ip: string;
  timestamp: number;
}

@Injectable()
export class ContactService {
  constructor(
    @InjectQueue('contact-emails') private readonly contactEmailQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async verifyTurnstile(token: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      },
    );

    const data = await response.json();
    return data.success === true;
  }

  async queueContactEmail(dto: ContactDto, ip: string): Promise<void> {
    const job: ContactEmailJob = {
      dto,
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
