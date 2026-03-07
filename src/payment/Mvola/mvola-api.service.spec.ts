import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MvolaApiService, mockMvolaStore } from './mvola-api.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('MvolaApiService', () => {
  let service: MvolaApiService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockTokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
  };

  const mockInitPaymentResponse = {
    serverCorrelationId: 'server-corr-id-123',
    status: 'pending',
    notificationMethod: 'polling',
  };

  const mockStatusResponse = {
    serverCorrelationId: 'server-corr-id-123',
    status: 'COMPLETED',
  };

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          MVOLA_BASE_URL: 'https://pre-api.mvola.mg',
          MVOLA_CONSUMER_KEY: 'test-consumer-key',
          MVOLA_CONSUMER_SECRET: 'test-consumer-secret',
          MVOLA_MERCHANT_PHONE: '0340000000',
          MVOLA_PARTNER_NAME: 'TestPartner',
          MVOLA_MODE: 'real',
        };
        return config[key] || defaultValue;
      }) as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MvolaApiService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MvolaApiService>(MvolaApiService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);

    // Clear mock store before each test
    mockMvolaStore?.clear?.();
  });

  describe('getAccessToken (real mode)', () => {
    it('should fetch and cache access token', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse) as any);

      const token = await service['getAccessToken']();

      expect(token).toBe('test-access-token');
      expect(httpService.post).toHaveBeenCalledWith(
        'https://developer.mvola.mg/oauth2/token',
        'grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }),
      );
    });

    it('should reuse cached token if not expired', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse) as any);

      // First call
      const token1 = await service['getAccessToken']();
      // Second call
      const token2 = await service['getAccessToken']();

      expect(token1).toBe(token2);
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should throw error when OAuth fails', async () => {
      const axiosError: AxiosError = {
        response: {
          data: { error: 'invalid_client' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: {} as any,
        },
        message: 'Request failed',
        name: 'AxiosError',
        config: {} as any,
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.post.mockReturnValue(throwError(() => axiosError) as any);

      await expect(service['getAccessToken']()).rejects.toThrow(
        "Impossible d'obtenir le token Mvola",
      );
    });
  });

  describe('initMerchantPay (real mode)', () => {
    const initParams = {
      amount: 5000,
      customerPhone: '0341234567',
      transactionReference: 'TXN-12345',
      correlationId: 'CORR-12345',
      callbackUrl: 'https://example.com/callback',
      descriptionText: 'Test payment',
    };

    beforeEach(() => {
      // Mock OAuth token
      const tokenResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.post.mockReturnValueOnce(of(tokenResponse) as any);
    });

    it('should initiate payment successfully', async () => {
      const paymentResponse: AxiosResponse = {
        data: mockInitPaymentResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValueOnce(of(paymentResponse) as any);

      const result = await service.initMerchantPay(initParams);

      expect(result.serverCorrelationId).toBe('server-corr-id-123');
      expect(result.status).toBe('pending');
      expect(httpService.post).toHaveBeenCalledWith(
        'https://pre-api.mvola.mg/mvola/mm/transactions/type/merchantpay/1.0.0',
        expect.objectContaining({
          amount: 5000,
          currency: 'Ar',
          descriptionText: 'Test payment',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
            'X-CorrelationID': 'CORR-12345',
            callbackUrl: 'https://example.com/callback',
          }),
        }),
      );
    });

    it('should use default description if not provided', async () => {
      const paymentResponse: AxiosResponse = {
        data: mockInitPaymentResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValueOnce(of(paymentResponse) as any);

      const paramsWithoutDesc = { ...initParams };
      delete paramsWithoutDesc.descriptionText;

      await service.initMerchantPay(paramsWithoutDesc);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          descriptionText: 'Paiement marchand',
        }),
        expect.any(Object),
      );
    });

    it('should throw error when payment initiation fails', async () => {
      const axiosError: AxiosError = {
        response: {
          data: { error: 'Insufficient funds' },
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        },
        message: 'Payment failed',
        name: 'AxiosError',
        config: {} as any,
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.post.mockReturnValueOnce(throwError(() => axiosError) as any);

      await expect(service.initMerchantPay(initParams)).rejects.toThrow(
        "Erreur lors de l'initiation du paiement Mvola",
      );
    });
  });

  describe('getTransactionStatus (real mode)', () => {
    const serverCorrelationId = 'server-corr-id-123';
    const correlationId = 'CORR-12345';

    beforeEach(() => {
      // Mock OAuth token
      const tokenResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.post.mockReturnValue(of(tokenResponse) as any);
    });

    it('should get transaction status successfully', async () => {
      const statusResponse: AxiosResponse = {
        data: mockStatusResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(statusResponse) as any);

      const result = await service.getTransactionStatus(
        serverCorrelationId,
        correlationId,
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.serverCorrelationId).toBe('server-corr-id-123');
      expect(httpService.get).toHaveBeenCalledWith(
        `https://pre-api.mvola.mg/mvola/mm/transactions/type/merchantpay/1.0/${serverCorrelationId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
            'X-CorrelationID': correlationId,
          }),
        }),
      );
    });

    it('should throw error when status check fails', async () => {
      const axiosError: AxiosError = {
        response: {
          data: { error: 'Transaction not found' },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        },
        message: 'Not found',
        name: 'AxiosError',
        config: {} as any,
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.get.mockReturnValue(throwError(() => axiosError) as any);

      await expect(
        service.getTransactionStatus(serverCorrelationId, correlationId),
      ).rejects.toThrow('Impossible de vérifier le statut de la transaction');
    });
  });

  describe('Mock Mode', () => {
    beforeEach(async () => {
      // Reconfigure service for mock mode
      configService.get = jest.fn((key: string, defaultValue?: any) => {
        const config = {
          MVOLA_BASE_URL: 'https://pre-api.mvola.mg',
          MVOLA_CONSUMER_KEY: 'test-consumer-key',
          MVOLA_CONSUMER_SECRET: 'test-consumer-secret',
          MVOLA_MERCHANT_PHONE: '0340000000',
          MVOLA_PARTNER_NAME: 'TestPartner',
          MVOLA_MODE: 'mock',
        };
        return config[key] || defaultValue;
      }) as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MvolaApiService,
          {
            provide: HttpService,
            useValue: httpService,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      service = module.get<MvolaApiService>(MvolaApiService);
      if (typeof mockMvolaStore.clear === 'function') {
        mockMvolaStore.clear();
      }
    });

    it('should return mock token in mock mode', async () => {
      const token = await service['getAccessToken']();

      expect(token).toBe('mock-token-12345');
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should create mock transaction in mock mode', async () => {
      const initParams = {
        amount: 5000,
        customerPhone: '0341234567',
        transactionReference: 'TXN-12345',
        correlationId: 'CORR-12345',
        callbackUrl: 'https://example.com/callback',
      };

      const result = await service.initMerchantPay(initParams);

      expect(result.status).toBe('pending');
      expect(result.serverCorrelationId).toBeDefined();
      expect(mockMvolaStore).toBeDefined();
      expect(mockMvolaStore!.size).toBe(1);

      const mockTx = mockMvolaStore!.get(result.serverCorrelationId);
      expect(mockTx).toBeDefined();
      expect(mockTx?.amount).toBe(5000);
      expect(mockTx?.status).toBe('PENDING');
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should get mock transaction status in mock mode', async () => {
      // Create mock transaction first
      const initParams = {
        amount: 5000,
        customerPhone: '0341234567',
        transactionReference: 'TXN-12345',
        correlationId: 'CORR-12345',
        callbackUrl: 'https://example.com/callback',
      };

      const initResult = await service.initMerchantPay(initParams);

      // Update mock transaction to SUCCESS
      expect(mockMvolaStore).toBeDefined();
      const existingTx = mockMvolaStore
        ? mockMvolaStore.get(initResult.serverCorrelationId)
        : undefined;
      expect(existingTx).toBeDefined();
      if (existingTx) {
        existingTx.status = 'SUCCESS';
      }

      const result = await service.getTransactionStatus(
        initResult.serverCorrelationId,
        'CORR-12345',
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.serverCorrelationId).toBe(initResult.serverCorrelationId);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent mock transaction', async () => {
      await expect(
        service.getTransactionStatus('non-existent-id', 'CORR-12345'),
      ).rejects.toThrow('Transaction mock introuvable');
    });
  });
});
