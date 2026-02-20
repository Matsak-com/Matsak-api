import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ContactService } from './contact.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('contact')
@UseGuards(ThrottlerGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 3600 } })
  @HttpCode(HttpStatus.OK)
  async submitContactForm(
    @Body() body: any,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    const dto = plainToInstance(ContactDto, body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const messages = errors.flatMap((err) =>
        Object.values(err.constraints || {}),
      );
      throw new BadRequestException(messages.join(', '));
    }

    // Vérification honeypot
    if (dto.honeypot) {
      return { message: 'Thank you for your message!' };
    }

    // Vérification CAPTCHA
    const isHuman = await this.contactService.verifyTurnstile(
      dto.turnstileToken,
    );
    if (!isHuman) {
      throw new ForbiddenException('CAPTCHA validation failed');
    }

    await this.contactService.queueContactEmail(dto, ip);

    return { message: 'Thank you for your message!' };
  }
}
