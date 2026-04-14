import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { I18nService } from './i18n.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.MAIL_HOST || 'localhost',
          port: parseInt(process.env.MAIL_PORT || '1025', 10),
          secure: process.env.MAIL_SECURE === 'true',
          auth:
            process.env.MAIL_USER && process.env.MAIL_PASS
              ? {
                  user: process.env.MAIL_USER,
                  pass: process.env.MAIL_PASS,
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
            strict: false,
            // Configuration du layout
            layout: 'default',
            layoutDir: join(__dirname, 'templates', 'layouts'),
            partialsDir: join(__dirname, 'templates', 'partials'),
            allowProtoPropertiesByDefault: true,
            allowProtoMethodsByDefault: true,
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'notifications',
      redis: process.env.REDIS_URL || {
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
    I18nService,
  ],
  exports: [NotificationService, I18nService, EmailProvider],
})
export class NotificationModule {}
