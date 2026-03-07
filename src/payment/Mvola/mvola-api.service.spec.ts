import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { MvolaApiService } from './mvola-api.service';
import { mockMvolaStore } from './mock/mvola-mock.store';

// ── Helper ─────────────────────────────────────────────────────────
const axiosResponse = (data: any) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

// ── Config ─────────────────────────────────────────────────────────
const BASE_CONFIG: Record<string, string> = {
  MVOLA_BASE_URL: 'https://pre-api.mvola.mg',
  MVOLA_CONSUMER_KEY: 'test-key',
  MVOLA_CONSUMER_SECRET: 'test-secret',
  MVOLA_MERCHANT_PHONE: '0340000000',
  MVOLA_PARTNER_NAME: 'TestPartner',
  MVOLA_MODE: 'mock',
};

const makeModule = async (
  httpService: any,
  overrides: Record<string, string> = {},
): Promise<MvolaApiService> => {
  const config = { ...BASE_CONFIG, ...overrides };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      MvolaApiService,
      { provide: HttpService, useValue: httpService },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, def?: string) => config[key] ?? def ?? '',
        },
      },
    ],
  }).compile();
  return module.get<MvolaApiService>(MvolaApiService);
};

const defaultParams = {
  amount: 10000,
  customerPhone: '0340000001',
  transactionReference: 'ref-001',
  correlationId: 'corr-001',
  callbackUrl: 'http://localhost/callback',
};

// ══════════════════════════════════════════════════════════════════
describe('MvolaApiService', () => {
  let service: MvolaApiService;
  let httpService: { post: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    // FIX: suppression du guard redondant "mockMvolaStore &&"
    // mockMvolaStore est un Map exporté statiquement, toujours défini
    if (typeof mockMvolaStore.clear === 'function') {
      mockMvolaStore.clear();
    }
    httpService = { post: jest.fn(), get: jest.fn() };
    service = await makeModule(httpService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── MODE MOCK ────────────────────────────────────────────────────
  describe('Mode MOCK', () => {
    describe('initMerchantPay', () => {
      it('retourne un serverCorrelationId et stocke la transaction', async () => {
        const result = await service.initMerchantPay(defaultParams);

        expect(result.serverCorrelationId).toBeDefined();
        expect(result.status).toBe('pending');
        expect(result.notificationMethod).toBe('polling');
        expect(mockMvolaStore.has(result.serverCorrelationId)).toBe(true);
      });

      it('stocke les données correctes dans le store', async () => {
        const result = await service.initMerchantPay(defaultParams);
        const stored = mockMvolaStore.get(result.serverCorrelationId)!;

        expect(stored.status).toBe('PENDING');
        expect(stored.amount).toBe(10000);
        expect(stored.customerPhone).toBe('0340000001');
        expect(stored.transactionReference).toBe('ref-001');
      });

      it('génère un UUID différent pour chaque appel', async () => {
        const r1 = await service.initMerchantPay(defaultParams);
        const r2 = await service.initMerchantPay({ ...defaultParams, transactionReference: 'ref-002' });

        expect(r1.serverCorrelationId).not.toBe(r2.serverCorrelationId);
      });

      it("n'appelle pas httpService en mode mock", async () => {
        await service.initMerchantPay(defaultParams);
        expect(httpService.post).not.toHaveBeenCalled();
      });
    });

    describe('getTransactionStatus', () => {
      it('retourne PENDING pour une transaction en attente', async () => {
        const { serverCorrelationId } = await service.initMerchantPay(defaultParams);
        const result = await service.getTransactionStatus(serverCorrelationId, 'corr-001');

        expect(result.status).toBe('PENDING');
        expect(result.serverCorrelationId).toBe(serverCorrelationId);
      });

      it('retourne COMPLETED quand le statut mock est SUCCESS', async () => {
        const { serverCorrelationId } = await service.initMerchantPay(defaultParams);

        // FIX: suppression du ternaire redondant, accès direct après assertion
        const tx = mockMvolaStore.get(serverCorrelationId)!;
        tx.status = 'SUCCESS';
        mockMvolaStore.set(serverCorrelationId, tx);

        const result = await service.getTransactionStatus(serverCorrelationId, 'corr-001');
        expect(result.status).toBe('COMPLETED');
      });

      it('retourne FAILED inchangé quand le statut mock est FAILED', async () => {
        const { serverCorrelationId } = await service.initMerchantPay(defaultParams);

        const tx = mockMvolaStore.get(serverCorrelationId)!;
        tx.status = 'FAILED';
        mockMvolaStore.set(serverCorrelationId, tx);

        const result = await service.getTransactionStatus(serverCorrelationId, 'corr-001');
        expect(result.status).toBe('FAILED');
      });

      it('met à jour le statut vers SUCCESS et vérifie la transaction', async () => {
        const initResult = await service.initMerchantPay(defaultParams);

        // FIX: suppression du ternaire "mockMvolaStore ? ... : undefined"
        // accès direct après expect().toBeDefined()
        expect(mockMvolaStore).toBeDefined();
        const existingTx = mockMvolaStore.get(initResult.serverCorrelationId);
        expect(existingTx).toBeDefined();

        if (existingTx) {
          existingTx.status = 'SUCCESS';
          mockMvolaStore.set(initResult.serverCorrelationId, existingTx);
        }

        const result = await service.getTransactionStatus(
          initResult.serverCorrelationId,
          'corr-001',
        );
        expect(result.status).toBe('COMPLETED');
      });

      it('lève une erreur si la transaction est introuvable', async () => {
        await expect(
          service.getTransactionStatus('unknown-id', 'corr-x'),
        ).rejects.toThrow('Transaction mock introuvable');
      });

      it("n'appelle pas httpService en mode mock", async () => {
        const { serverCorrelationId } = await service.initMerchantPay(defaultParams);
        await service.getTransactionStatus(serverCorrelationId, 'corr-001');
        expect(httpService.get).not.toHaveBeenCalled();
      });
    });
  });

  // ── MODE RÉEL ────────────────────────────────────────────────────
  describe('Mode RÉEL', () => {
    let realService: MvolaApiService;

    const mockTokenResponse = () =>
      httpService.post.mockReturnValueOnce(
        of(axiosResponse({
          access_token: 'tok-abc',
          token_type: 'Bearer',
          expires_in: 3600,
        })) as any,
      );

    beforeEach(async () => {
      realService = await makeModule(httpService, { MVOLA_MODE: 'real' });
    });

    describe('initMerchantPay', () => {
      it('appelle le token OAuth puis POST merchantpay', async () => {
        mockTokenResponse();
        httpService.post.mockReturnValueOnce(
          of(axiosResponse({ serverCorrelationId: 'real-corr-001', status: 'pending' })) as any,
        );

        const result = await realService.initMerchantPay(defaultParams);

        expect(result.serverCorrelationId).toBe('real-corr-001');
        expect(httpService.post).toHaveBeenCalledTimes(2);
      });

      it('ne stocke rien dans mockMvolaStore en mode réel', async () => {
        mockTokenResponse();
        httpService.post.mockReturnValueOnce(
          of(axiosResponse({ serverCorrelationId: 'real-corr-002', status: 'pending' })) as any,
        );

        await realService.initMerchantPay(defaultParams);
        expect(mockMvolaStore.size).toBe(0);
      });

      it("lève une erreur si l'API retourne une erreur", async () => {
        mockTokenResponse();
        httpService.post.mockReturnValueOnce(
          throwError(() => ({ message: 'Network error', response: null })) as any,
        );

        await expect(realService.initMerchantPay(defaultParams)).rejects.toThrow(
          "Erreur lors de l'initiation du paiement Mvola",
        );
      });

      it("lève une erreur si l'OAuth échoue", async () => {
        httpService.post.mockReturnValueOnce(
          throwError(() => ({ message: 'Unauthorized', response: { data: 'error' } })) as any,
        );

        await expect(realService.initMerchantPay(defaultParams)).rejects.toThrow(
          "Impossible d'obtenir le token Mvola",
        );
      });
    });

    describe('getTransactionStatus', () => {
      it('appelle le token OAuth puis GET status', async () => {
        mockTokenResponse();
        httpService.get.mockReturnValueOnce(
          of(axiosResponse({ serverCorrelationId: 'corr-001', status: 'COMPLETED' })) as any,
        );

        const result = await realService.getTransactionStatus('corr-001', 'x-corr-001');

        expect(result.status).toBe('COMPLETED');
        expect(httpService.get).toHaveBeenCalledTimes(1);
      });

      it('lève une erreur si le GET status échoue', async () => {
        mockTokenResponse();
        httpService.get.mockReturnValueOnce(
          throwError(() => ({ message: 'Not found', response: null })) as any,
        );

        await expect(
          realService.getTransactionStatus('corr-001', 'x-corr-001'),
        ).rejects.toThrow('Impossible de vérifier le statut de la transaction');
      });
    });

    describe('cache du token OAuth', () => {
      it('réutilise le token si non expiré', async () => {
        mockTokenResponse();
        httpService.post.mockReturnValue(
          of(axiosResponse({ serverCorrelationId: 'sc', status: 'pending' })) as any,
        );

        await realService.initMerchantPay(defaultParams);
        await realService.initMerchantPay({ ...defaultParams, transactionReference: 'ref-002' });

        // 1 appel token + 2 appels merchantpay = 3, mais le token est caché
        // donc token appelé 1 seule fois
        const tokenCalls = (httpService.post as jest.Mock).mock.calls.filter(
          (call) => String(call[0]).includes('oauth2/token'),
        );
        expect(tokenCalls.length).toBe(1);
      });
    });
  });
});