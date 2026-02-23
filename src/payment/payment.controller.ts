import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PaymentService, InitPaymentInput } from './payment.service';
import { mockMvolaStore } from './Mvola/mvola-api.service';
import { IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';


class InitPaymentDto {
  @IsString()
  cartId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()  
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

  @UseGuards(JwtAuthGuard)
  @Get('status/:paymentId')
  async getStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.pollStatus(paymentId);
  }

  // ── Route MOCK : simuler la confirmation client ──────────────────
  @Post('mock/confirm/:serverCorrelationId')
  @HttpCode(HttpStatus.OK)
  mockConfirm(@Param('serverCorrelationId') serverCorrelationId: string) {
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
