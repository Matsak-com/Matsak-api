import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EmailProvider } from '../notifications/providers/email.provider';
import { ContactEmailJob } from './contact.service';
import { Job } from 'bull';

@Processor('contact-emails')
export class ContactProcessor {
  private readonly logger = new Logger(ContactProcessor.name);

  constructor(
    @Inject('EmailProvider') private readonly emailProvider: EmailProvider,
  ) {}

  @Process('send-contact-email')
  async handleContactEmail(job: Job<ContactEmailJob>): Promise<void> {
    const { dto, ip, timestamp } = job.data;

    const formattedDate = new Date(timestamp).toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Indian/Antananarivo',
    });

    this.logger.log(`Processing contact email from ${dto.email} (IP: ${ip})`);

    try {
      await this.emailProvider.sendEmail({
        to: process.env.CONTACT_EMAIL || 'contact@matsak-mg.com',
        subject: `[Contact Form] ${dto.subject}`,
        template: 'contact',
        context: {
          user: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
          },
          subject: dto.subject,
          message: dto.message,
          ip: ip,
          timestamp: formattedDate,
        },
        locale: 'fr',
      });

      this.logger.log(`Email sent successfully to ${dto.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send contact email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job<ContactEmailJob>, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
