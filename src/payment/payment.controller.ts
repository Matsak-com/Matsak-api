import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentService, InitPaymentInput } from './payment.service';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { MvolaWebhookGuard } from './guards/mvola-webhook.guard';
import { DeliveryMethod } from './payment.schema';
import { ERRORS } from '../common/errors';

class InitPaymentDto {
  @IsMongoId({ message: 'cartId doit être un ObjectId valide' })
  cartId: string;

  @IsPhoneNumber('MG', {
    message: 'customerPhone doit être un numéro malgache valide',
  })
  customerPhone: string;

  @IsEnum(DeliveryMethod, {
    message: 'deliveryMethod doit être "delivery" ou "pickup"',
  })
  deliveryMethod: DeliveryMethod;

  @ValidateIf((o) => o.deliveryMethod === DeliveryMethod.DELIVERY)
  @IsMongoId({ message: 'deliveryAddressId doit être un ObjectId valide' })
  @IsOptional()
  deliveryAddressId?: string;

  @IsMongoId({ message: 'promotionId doit être un ObjectId valide' })
  @IsOptional()
  promotionId?: string;
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiate(@Body() dto: InitPaymentDto, @Request() req: any) {
    const input: InitPaymentInput = {
      cartId: dto.cartId,
      userId: req.user?.userId,
      customerPhone: dto.customerPhone,
      deliveryMethod: dto.deliveryMethod,
      deliveryAddressId: dto.deliveryAddressId,
      promotionId: dto.promotionId,
    };

    return this.paymentService.initiate(input);
  }

  @Post('callback')
  @UseGuards(MvolaWebhookGuard)
  @HttpCode(HttpStatus.OK)
  async callback(@Body() callbackData: Record<string, any>) {
    await this.paymentService.handleCallback(callbackData);
    return { received: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:paymentId')
  async getStatus(@Param('paymentId') paymentId: string, @Request() req: any) {
    const payment = await this.paymentService.pollStatus(paymentId);

    if (payment.userId?.toString() !== req.user?.userId) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_PAYMENT_ACCESS);
    }

    return payment;
  }
}
