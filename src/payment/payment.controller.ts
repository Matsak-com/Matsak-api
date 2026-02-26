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
} from '@nestjs/common';
import { PaymentService, InitPaymentInput } from './payment.service';
import { mockMvolaStore } from './Mvola/mvola-api.service';
import { IsMongoId, IsPhoneNumber } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { MvolaWebhookGuard } from './guards/mvola-webhook.guard';

class InitPaymentDto {
  @IsMongoId({ message: 'cartId doit être un ObjectId valide' })
  cartId: string;

  @IsPhoneNumber('MG', {
    message: 'customerPhone doit être un numéro malgache valide',
  })
  customerPhone: string;
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
  async getStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.pollStatus(paymentId);
  }

  // ── Route MOCK : simuler la confirmation client ──────────────────
  @Post('mock/confirm/:serverCorrelationId')
  @HttpCode(HttpStatus.OK)
  mockConfirm(@Param('serverCorrelationId') serverCorrelationId: string) {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'Route non disponible en production' };
    }

    const mockTx = mockMvolaStore.get(serverCorrelationId);

    if (!mockTx) {
      return { error: 'Transaction introuvable' };
    }

    mockTx.status = 'SUCCESS';
    mockMvolaStore.set(serverCorrelationId, mockTx);

    this.paymentService.handleCallback({
      serverCorrelationId,
      status: 'COMPLETED',
      transactionReference: mockTx.transactionReference,
    });

    return { success: true, status: 'SUCCESS' };
  }
}
