import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('locales')
  @HttpCode(HttpStatus.OK)
  getSupportedLocales() {
    return {
      supportedLocales: [
        { code: 'en', name: 'English', direction: 'ltr' },
        { code: 'fr', name: 'Français', direction: 'ltr' },
        { code: 'zh', name: '中文', direction: 'ltr' },
        { code: 'ar', name: 'العربية', direction: 'rtl' },
      ],
      templates: [
        'welcome',
        'reset-password',
        'order-confirmation',
        'verify-email',
      ],
    };
  }

  @Post('email')
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    await this.notificationService.sendEmail(sendEmailDto);
    return { message: 'Email sent successfully' };
  }

  @Post('email/plain-text')
  @HttpCode(HttpStatus.OK)
  async sendPlainTextEmail(
    @Body() body: { to: string; subject: string; text: string },
  ) {
    await this.notificationService.sendEmail({
      to: body.to,
      subject: body.subject,
      text: body.text,
    });
    return { message: 'Plain text email sent successfully' };
  }

  @Post('email/html')
  @HttpCode(HttpStatus.OK)
  async sendHtmlEmail(
    @Body() body: { to: string; subject: string; html: string },
  ) {
    await this.notificationService.sendEmail({
      to: body.to,
      subject: body.subject,
      html: body.html,
    });
    return { message: 'HTML email sent successfully' };
  }

  @Post('email/template')
  @HttpCode(HttpStatus.OK)
  async sendTemplateEmail(
    @Body()
    body: {
      to: string;
      subject: string;
      template: string;
      context: any;
      locale?: 'en' | 'fr' | 'zh' | 'ar';
    },
  ) {
    await this.notificationService.sendEmail({
      to: body.to,
      subject: body.subject,
      template: body.template,
      context: body.context,
      locale: body.locale || 'en',
    });
    return { message: 'Template email sent successfully' };
  }

  @Post('sms')
  @HttpCode(HttpStatus.OK)
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    await this.notificationService.sendSms(sendSmsDto);
    return { message: 'SMS sent successfully' };
  }
}
