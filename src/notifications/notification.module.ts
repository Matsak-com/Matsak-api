import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST || 'localhost',
        port: parseInt(process.env.MAIL_PORT || '1025', 10),
        secure: process.env.MAIL_SECURE === 'true',
        auth:
          process.env.MAIL_USER && process.env.MAIL_PASSWORD
            ? {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD,
              }
            : undefined,
      },
      defaults: {
        from: process.env.MAIL_FROM || '"Matsak" <noreply@matsak.com>',
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter({
          year: () => new Date().getFullYear(),
        }),
        options: {
          strict: true,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'notifications',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProcessor,
    EmailProvider,
    SmsProvider,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
