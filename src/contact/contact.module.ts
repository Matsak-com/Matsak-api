import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactProcessor } from './contact.processor';
import { EmailProvider } from '../notifications/providers/email.provider';
import { BullModule } from '@nestjs/bull';
import { NotificationModule } from 'src/notifications/notification.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'contact-emails',
    }),
    NotificationModule,
  ],
  controllers: [ContactController],
  providers: [
    ContactService,
    ContactProcessor,
    {
      provide: 'EmailProvider',
      useExisting: EmailProvider,
    },
  ],
  exports: [ContactService],
})
export class ContactModule {}
