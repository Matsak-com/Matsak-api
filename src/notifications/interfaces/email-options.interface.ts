export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  locale?: 'en' | 'fr' | 'zh' | 'ar'; // Supported locales
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

export interface ScheduledEmailOptions extends EmailOptions {
  sendAt: Date;
}
