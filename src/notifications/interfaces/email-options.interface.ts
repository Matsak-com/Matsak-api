export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  locale?: 'en' | 'fr' | 'zh' | 'ar';
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    cid?: string; // ← pour les images inline (QR codes)
    contentType?: string; // ← 'image/png'
  }>;
}

export interface ScheduledEmailOptions extends EmailOptions {
  sendAt: Date;
}
