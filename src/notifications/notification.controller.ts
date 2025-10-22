import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('email')
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    await this.notificationService.sendEmail(sendEmailDto);
    return { message: 'Email sent successfully' };
  }

  @Post('sms')
  @HttpCode(HttpStatus.OK)
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    await this.notificationService.sendSms(sendSmsDto);
    return { message: 'SMS sent successfully' };
  }
}
