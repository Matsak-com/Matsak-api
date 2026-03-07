import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService, InitPaymentInput } from './payment.service';
import { mockMvolaStore } from './Mvola/mvola-api.service';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

class InitPaymentDto {
  @IsString()
  @IsNotEmpty()
  cartId: string;
  @IsOptional()
  @IsString()
  userId?: string;
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber(null)
  customerPhone: string;
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiate(@Body() dto: InitPaymentDto) {
    const input: InitPaymentInput = {
      cartId: dto.cartId,
      userId: dto.userId,
      customerPhone: dto.customerPhone,
    };

    return this.paymentService.initiate(input);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async callback(@Body() callbackData: Record<string, any>) {
    await this.paymentService.handleCallback(callbackData);
    return { received: true };
  }

  @Get('status/:paymentId')
  async getStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.pollStatus(paymentId);
  }

  // ── Route MOCK : simuler la confirmation client ──────────────────
  @Post('mock/confirm/:serverCorrelationId')
  @HttpCode(HttpStatus.OK)
  mockConfirm(@Param('serverCorrelationId') serverCorrelationId: string) {
    if (typeof mockMvolaStore.get !== 'function') {
      return { error: 'Mock store non initialisé' };
    }

    const mockTx = mockMvolaStore.get(serverCorrelationId);

    if (!mockTx) {
      return { error: 'Transaction introuvable' };
    }

    // Marquer comme SUCCESS
    mockTx.status = 'SUCCESS';
    mockMvolaStore.set(serverCorrelationId, mockTx);

    // Simuler le callback
    this.paymentService.handleCallback({
      serverCorrelationId,
      status: 'COMPLETED',
      transactionReference: mockTx.transactionReference,
    });

    return { success: true, status: 'SUCCESS' };
  }
}
