import { EmailOptions } from './email-options.interface';
import { SmsOptions } from './sms-options.interface';

export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

export interface ISmsProvider {
  sendSms(options: SmsOptions): Promise<void>;
}
