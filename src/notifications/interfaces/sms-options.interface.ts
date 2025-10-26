export interface SmsOptions {
  to: string | string[];
  message: string;
}

export interface ScheduledSmsOptions extends SmsOptions {
  sendAt: Date;
}
