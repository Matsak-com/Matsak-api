import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import {
  EmailOptions,
  ScheduledEmailOptions,
} from './interfaces/email-options.interface';
import {
  SmsOptions,
  ScheduledSmsOptions,
} from './interfaces/sms-options.interface';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  async sendEmail(options: EmailOptions): Promise<void> {
    await this.emailProvider.sendEmail(options);
  }

  async sendSms(options: SmsOptions): Promise<void> {
    await this.smsProvider.sendSms(options);
  }

  async scheduleEmail(options: ScheduledEmailOptions): Promise<void> {
    const { sendAt, ...emailOptions } = options;
    const delay = sendAt.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.warn('Scheduled time is in the past, sending immediately');
      await this.sendEmail(emailOptions);
      return;
    }

    await this.notificationQueue.add('send-email', { emailOptions }, { delay });

    this.logger.log(`Email scheduled to be sent at ${sendAt.toISOString()}`);
  }

  async scheduleSms(options: ScheduledSmsOptions): Promise<void> {
    const { sendAt, ...smsOptions } = options;
    const delay = sendAt.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.warn('Scheduled time is in the past, sending immediately');
      await this.sendSms(smsOptions);
      return;
    }

    await this.notificationQueue.add('send-sms', { smsOptions }, { delay });

    this.logger.log(`SMS scheduled to be sent at ${sendAt.toISOString()}`);
  }
}
