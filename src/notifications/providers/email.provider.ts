import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailOptions } from '../interfaces/email-options.interface';
import { IEmailProvider } from '../interfaces/notification-provider.interface';

@Injectable()
export class EmailProvider implements IEmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const { to, subject, template, context, html, text, attachments } =
        options;

      const mailOptions: any = {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
      };

      if (template && context) {
        mailOptions.template = template;
        mailOptions.context = context;
      } else if (html) {
        mailOptions.html = html;
      } else if (text) {
        mailOptions.text = text;
      }

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      await this.mailerService.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${mailOptions.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
