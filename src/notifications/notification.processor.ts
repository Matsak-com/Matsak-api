import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { EmailOptions } from './interfaces/email-options.interface';
import { SmsOptions } from './interfaces/sms-options.interface';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<{ emailOptions: EmailOptions }>) {
    this.logger.log(`Processing email job ${job.id}`);
    try {
      await this.emailProvider.sendEmail(job.data.emailOptions);
      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Email job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Process('send-sms')
  async handleSendSms(job: Job<{ smsOptions: SmsOptions }>) {
    this.logger.log(`Processing SMS job ${job.id}`);
    try {
      await this.smsProvider.sendSms(job.data.smsOptions);
      this.logger.log(`SMS job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `SMS job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
