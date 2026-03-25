import { Injectable, Logger } from '@nestjs/common',
import { ConfigService } from '@nestjs/config',
import { HttpService } from '@nestjs/axios',
import { v4 as uuidv4 } from 'uuid',
import { firstValueFrom } from 'rxjs',
import { map, catchError } from 'rxjs/operators',
import { AxiosError } from 'axios',
import { mockMvolaStore } from './mock/mvola-mock.store',

// ── Types ──────────────────────────────────────────────────────────
export interface MvolaTokenResponse {
  access_token: string,
  token_type: string,
  expires_in: number,
}

export interface MvolaInitPaymentResponse {
  serverCorrelationId: string,
  status: string,
  [key: string]: any,
}

export interface MvolaStatusResponse {
  status: string,
  serverCorrelationId: string,
  [key: string]: any,
}

export interface InitMerchantPayParams {
  amount: number,
  customerPhone: string,
  transactionReference: string,
  correlationId: string,
  callbackUrl: string,
  descriptionText?: string,
}

@Injectable()
export class MvolaApiService {
  private readonly logger = new Logger(MvolaApiService.name),

  private readonly baseUrl: string,
  private readonly consumerKey: string,
  private readonly consumerSecret: string,
  private readonly merchantPhone: string,
  private readonly partnerName: string,
  private readonly mockMode: boolean,

  private accessToken: string | null = null,
  private tokenExpiresAt: number = 0,

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'MVOLA_BASE_URL',
      'https://pre-api.mvola.mg',
    ),
    this.consumerKey = this.configService.get<string>('MVOLA_CONSUMER_KEY', ''),
    this.consumerSecret = this.configService.get<string>(
      'MVOLA_CONSUMER_SECRET',
      '',
    ),
    this.merchantPhone = this.configService.get<string>(
      'MVOLA_MERCHANT_PHONE',
      '',
    ),
    this.partnerName = this.configService.get<string>('MVOLA_PARTNER_NAME', ''),
    const mvolaMode = this.configService
      .get<string>('MVOLA_MODE', '')
      .toLowerCase(),
    this.mockMode =
      mvolaMode === 'mock' || mvolaMode === 'true' || mvolaMode === '1',

    if (this.mockMode) {
      this.logger.warn('🧪 MVola API en mode MOCK — aucune vraie transaction'),
    }
  }

  // ── 1. OAuth : obtenir le token ──────────────────────────────────
  private async getAccessToken(): Promise<string> {
    if (this.mockMode) {
      return 'mock-token-12345',
    }

    const now = Date.now(),

    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken,
    }

    this.logger.log("Génération d'un nouveau token OAuth Mvola…"),

    const credentials = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`,
    ).toString('base64'),

    const response = await firstValueFrom(
      this.httpService
        .post<MvolaTokenResponse>(
          `${this.baseUrl}/oauth2/token`, // ← fix Copilot appliqué
          'grant_type=client_credentials',
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
        .pipe(
          map((res) => res.data),
          catchError((error: AxiosError) => {
            this.logger.error(
              'Error OAuth Mvola',
              error.response?.data || error.message,
            ),
            throw new Error("Impossible d'obtenir le token Mvola"), // ← fix
          }),
        ),
    ),

    this.accessToken = response.access_token,
    this.tokenExpiresAt = now + (response.expires_in - 60) * 1000,

    return this.accessToken,
  }

  // ── 2. POST /merchantpay — initier le paiement ────────────────────
  async initMerchantPay(
    params: InitMerchantPayParams,
  ): Promise<MvolaInitPaymentResponse> {
    if (this.mockMode) {
      this.logger.warn(
        `🧪 MOCK init — amount: ${params.amount}, phone: ${params.customerPhone}`,
      ),

      const serverCorrelationId = uuidv4(),

      mockMvolaStore.set(serverCorrelationId, {
        serverCorrelationId,
        transactionReference: params.transactionReference,
        status: 'PENDING',
        amount: params.amount,
        customerPhone: params.customerPhone,
      }),

      return {
        serverCorrelationId,
        status: 'pending',
        notificationMethod: 'polling',
      },
    }

    const token = await this.getAccessToken(),

    const body = {
      amount: params.amount,
      currency: 'Ar',
      descriptionText: params.descriptionText || 'Paiement marchand',
      requestDate: new Date().toISOString(),
      debitParty: [{ key: 'msisdn', value: params.customerPhone }],
      creditParty: [{ key: 'msisdn', value: this.merchantPhone }],
      metadata: [
        { key: 'partnerName', value: this.partnerName },
        { key: 'fc', value: 'MGA' },
        { key: 'amountFc', value: String(params.amount) },
      ],
      requestingOrganisationTransactionReference: params.transactionReference,
      originalTransactionReference: params.transactionReference,
    },

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Version: '1.0',
      'X-CorrelationID': params.correlationId,
      UserLanguage: 'FR',
      UserAccountIdentifier: `msisdn,${this.merchantPhone}`,
      partnerName: this.partnerName,
      'Cache-Control': 'no-cache',
      ...(params.callbackUrl && { callbackUrl: params.callbackUrl }),
    },

    this.logger.log(
      `POST merchantpay — correlationId: ${params.correlationId}, amount: ${params.amount}`,
    ),

    const response = await firstValueFrom(
      this.httpService
        .post<MvolaInitPaymentResponse>(
          `${this.baseUrl}/mvola/mm/transactions/type/merchantpay/1.0.0`,
          body,
          { headers },
        )
        .pipe(
          map((res) => res.data),
          catchError((error: AxiosError) => {
            this.logger.error(
              'Error POST merchantpay',
              error.response?.data || error.message,
            ),
            throw new Error("Erreur lors de l'initiation du paiement Mvola"), // ← fix
          }),
        ),
    ),

    return response,
  }

  // ── 3. GET /merchantpay/{serverCorrelationId} — vérifier le statut ─
  async getTransactionStatus(
    serverCorrelationId: string,
    correlationId: string,
  ): Promise<MvolaStatusResponse> {
    if (this.mockMode) {
      const mockTx = mockMvolaStore.get(serverCorrelationId),

      if (!mockTx) {
        throw new Error('Transaction mock introuvable'),
      }

      this.logger.warn(
        `🧪 MOCK status — ${serverCorrelationId}: ${mockTx.status}`,
      ),

      return {
        serverCorrelationId,
        status: mockTx.status === 'SUCCESS' ? 'COMPLETED' : mockTx.status,
      },
    }

    const token = await this.getAccessToken(),

    const headers = {
      Authorization: `Bearer ${token}`,
      Version: '1.0',
      'X-CorrelationID': correlationId,
      UserLanguage: 'FR',
      UserAccountIdentifier: `msisdn,${this.merchantPhone}`,
      partnerName: this.partnerName,
      'Cache-Control': 'no-cache',
    },

    this.logger.log(`GET status — serverCorrelationId: ${serverCorrelationId}`),

    const response = await firstValueFrom(
      this.httpService
        .get<MvolaStatusResponse>(
          `${this.baseUrl}/mvola/mm/transactions/type/merchantpay/1.0/${serverCorrelationId}`,
          { headers },
        )
        .pipe(
          map((res) => res.data),
          catchError((error: AxiosError) => {
            this.logger.error(
              'Error GET status',
              error.response?.data || error.message,
            ),
            throw new Error(
              'Impossible de vérifier le statut de la transaction',
            ), // ← fix
          }),
        ),
    ),

    return response,
  }
}

export { mockMvolaStore },
