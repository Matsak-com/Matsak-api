import { Injectable, Logger } from '@nestjs/common';
import { SmsOptions } from '../interfaces/sms-options.interface';
import { ISmsProvider } from '../interfaces/notification-provider.interface';

@Injectable()
export class SmsProvider implements ISmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  async sendSms(options: SmsOptions): Promise<void> {
    try {
      const { to, message } = options;
      const recipients = Array.isArray(to) ? to.join(', ') : to;

      // TODO: Implement actual SMS sending logic with provider like Twilio
      // For now, this is a placeholder that logs the SMS
      this.logger.log(`SMS would be sent to ${recipients}: ${message}`);
      this.logger.warn(
        'SMS sending is not yet implemented. Please configure an SMS provider (e.g., Twilio)',
      );
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      throw error;
    }
  }
}
