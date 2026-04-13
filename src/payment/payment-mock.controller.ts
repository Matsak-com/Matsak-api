import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { mockMvolaStore } from './Mvola/mvola-api.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ERRORS } from '../common/errors';

/**
 * Controller de simulation MVola — chargé UNIQUEMENT en développement/test.
 *
 * Ne jamais importer dans AppModule directement.
 * Utiliser DevPaymentModule (voir payment.module.ts) qui est conditionnel.
 *
 * Routes exposées :
 *   POST /payments/mock/confirm/:serverCorrelationId
 */
@Controller('payments/mock')
@UseGuards(JwtAuthGuard)
export class PaymentMockController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('confirm/:serverCorrelationId')
  @HttpCode(HttpStatus.OK)
  mockConfirm(@Param('serverCorrelationId') serverCorrelationId: string) {
    // Double vérification au cas où le module serait accidentellement chargé
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(ERRORS.FORBIDDEN_IN_PRODUCTION);
    }

    const mockTx = mockMvolaStore.get(serverCorrelationId);

    if (!mockTx) {
      throw new NotFoundException(
        `Transaction mock introuvable: ${serverCorrelationId}`,
      );
    }

    mockTx.status = 'SUCCESS';
    mockMvolaStore.set(serverCorrelationId, mockTx);

    // Fire-and-forget intentionnel — le client poll /status séparément
    void this.paymentService.handleCallback({
      serverCorrelationId,
      status: 'COMPLETED',
      transactionReference: mockTx.transactionReference,
    });

    return { success: true, status: 'SUCCESS', serverCorrelationId };
  }
}
