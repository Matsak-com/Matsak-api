import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { CartRepository } from '../cart-item/cart.repository';
import { CartService } from '../cart-item/cart.service';
import { MvolaApiService } from './Mvola/mvola-api.service';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from '../invoice/invoice.service';
import { InventoryService } from '../inventory/inventory.service';
import { PricingService } from '../pricing/pricing.service';

import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  DeliveryMethod,
} from './payment.schema';

// ══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ══════════════════════════════════════════════════════════════════════════════

const CART_ID = new Types.ObjectId();
const USER_ID = new Types.ObjectId();
const PAYMENT_ID = new Types.ObjectId();
const PRODUCT_ID = new Types.ObjectId();
const TEAM_ID = new Types.ObjectId();
const ADDRESS_ID = new Types.ObjectId();

const mockPricingSnapshot = {
  currency: 'MGA',
  exchangeRate: 4800,
  exchangeRateSnapshotAt: new Date('2026-04-23'),
  subtotalEur: 100,
  subtotalLocal: 480000,
  pricingLines: [
    {
      type: 'delivery',
      name: 'Frais de livraison',
      baseType: 'FIXED',
      basePriceEur: 5,
      basePercentage: null,
      resolvedEur: 5,
      localPrice: 24000,
    },
  ],
  surchargesTotalEur: 5,
  surchargesTotalLocal: 24000,
  discountEur: 0,
  discountLocal: 0,
  promoCodeSnapshot: null,
  totalEur: 105,
  totalLocal: 504000,
};

const mockCart = {
  _id: CART_ID,
  deleted_at: null,
  sessionId: 'sess_abc',
  items: [
    {
      product: {
        _id: PRODUCT_ID,
        name: 'Paracétamol',
        basePrice: 480000,
        currency: 'MGA',
        trackStock: true,
        team: { _id: TEAM_ID, name: 'Pharmacie Test' },
        detail: { name: 'Paracétamol 500mg', description: 'Antidouleur' },
      },
      quantity: 1,
    },
  ],
};

const mockPayment: Partial<Payment> & { _id: Types.ObjectId } = {
  _id: PAYMENT_ID,
  cartId: CART_ID,
  userId: USER_ID,
  method: PaymentMethod.MVOLA,
  amount: 504000,
  currency: 'Ar',
  status: PaymentStatus.SUCCESS,
  deliveryMethod: DeliveryMethod.DELIVERY,
  deliveryAddressId: ADDRESS_ID,
  correlationId: 'corr-123',
  serverCorrelationId: 'server-corr-123',
  transactionReference: 'txn-123',
  customerPhone: '0340000000',
  pricingSnapshot: mockPricingSnapshot as any,
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

const mockPaymentRepo = {
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  transitionStatus: jest.fn(),
};

const mockCartRepo = {
  findById: jest.fn(),
};

const mockCartService = {
  softDeleteCartById: jest.fn(),
};

const mockMvolaApi = {
  initMerchantPay: jest.fn(),
  getTransactionStatus: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:3000'),
};

const mockInvoiceService = {
  createInvoiceFromPayment: jest.fn(),
  findByPaymentId: jest.fn(),
};

const mockInventoryService = {
  stockOut: jest.fn(),
};

const mockPricingService = {
  calculateTotal: jest.fn(),
  redeemPromoCode: jest.fn(),
};

// ══════════════════════════════════════════════════════════════════════════════
// SUITE
// ══════════════════════════════════════════════════════════════════════════════

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentRepository, useValue: mockPaymentRepo },
        { provide: CartRepository, useValue: mockCartRepo },
        { provide: CartService, useValue: mockCartService },
        { provide: MvolaApiService, useValue: mockMvolaApi },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: PricingService, useValue: mockPricingService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    jest.clearAllMocks();
  });

  // ── initiate() ──────────────────────────────────────────────────────────────

  describe('initiate()', () => {
    const input = {
      cartId: CART_ID.toString(),
      userId: USER_ID.toString(),
      customerPhone: '0340000000',
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryAddressId: ADDRESS_ID.toString(),
    };

    beforeEach(() => {
      mockCartRepo.findById.mockResolvedValue(mockCart);
      mockPricingService.calculateTotal.mockResolvedValue(mockPricingSnapshot);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ ...mockPayment });
      mockMvolaApi.initMerchantPay.mockResolvedValue({
        serverCorrelationId: 'server-corr-123',
      });
      mockPaymentRepo.update.mockResolvedValue(mockPayment);
      mockPaymentRepo.findById.mockResolvedValue(mockPayment);
    });

    it('calcule le pricing une seule fois et le fige dans pricingSnapshot', async () => {
      await service.initiate(input);

      expect(mockPricingService.calculateTotal).toHaveBeenCalledTimes(1);
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            pricingSnapshot: expect.objectContaining({
              currency: 'MGA',
              totalLocal: mockPricingSnapshot.totalLocal,
            }),
          }),
        }),
      );
    });

    it('amount === pricingSnapshot.totalLocal', async () => {
      await service.initiate(input);
      const doc = mockPaymentRepo.create.mock.calls[0][0].doc;
      expect(doc.amount).toBe(doc.pricingSnapshot.totalLocal);
    });

    it('lève NotFoundException si le panier est introuvable', async () => {
      mockCartRepo.findById.mockResolvedValue(null);
      await expect(service.initiate(input)).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si le panier est vide', async () => {
      mockCartRepo.findById.mockResolvedValue({ ...mockCart, items: [] });
      await expect(service.initiate(input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève BadRequestException si un paiement actif existe déjà', async () => {
      mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
      await expect(service.initiate(input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève BadRequestException si livraison sans adresse', async () => {
      await expect(
        service.initiate({ ...input, deliveryAddressId: undefined }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rachète le promo code si présent et valide', async () => {
      mockPricingService.calculateTotal.mockResolvedValue({
        ...mockPricingSnapshot,
        promoCodeSnapshot: {
          code: 'PROMO10',
          discountType: 'percentage',
          discountValue: 10,
        },
        discountEur: 10,
        discountLocal: 48000,
        totalLocal: 456000,
      });
      mockPricingService.redeemPromoCode.mockResolvedValue(undefined);
      mockPaymentRepo.create.mockResolvedValue({
        ...mockPayment,
        amount: 456000,
      });

      await service.initiate({ ...input, promoCode: 'PROMO10' });

      expect(mockPricingService.redeemPromoCode).toHaveBeenCalledWith(
        'PROMO10',
        expect.any(Number),
        expect.any(String),
      );
    });

    it('marque le paiement FAILED en rollback si Mvola échoue', async () => {
      mockMvolaApi.initMerchantPay.mockRejectedValue(
        new Error('Mvola timeout'),
      );

      await expect(service.initiate(input)).rejects.toThrow('Mvola timeout');

      expect(mockPaymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: PaymentStatus.FAILED }),
        }),
      );
    });
  });

  // ── handleCallback() ────────────────────────────────────────────────────────

  describe('handleCallback()', () => {
    const waitingPayment = { ...mockPayment, status: PaymentStatus.WAITING };

    beforeEach(() => {
      mockPaymentRepo.findOne.mockResolvedValue(waitingPayment);
      mockPaymentRepo.transitionStatus.mockResolvedValue(true);
      mockCartRepo.findById.mockResolvedValue(mockCart);
      mockInventoryService.stockOut.mockResolvedValue(undefined);
      mockInvoiceService.createInvoiceFromPayment.mockResolvedValue(undefined);
      mockCartService.softDeleteCartById.mockResolvedValue(undefined);
    });

    it('ignore le callback sans serverCorrelationId', async () => {
      await service.handleCallback({ status: 'COMPLETED' });
      expect(mockPaymentRepo.findOne).not.toHaveBeenCalled();
    });

    it('ignore le callback pour un paiement déjà SUCCESS', async () => {
      mockPaymentRepo.findOne.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });
      await service.handleCallback({
        serverCorrelationId: 'server-corr-123',
        status: 'COMPLETED',
      });
      expect(mockPaymentRepo.transitionStatus).not.toHaveBeenCalled();
    });

    it('marque FAILED si status !== COMPLETED', async () => {
      await service.handleCallback({
        serverCorrelationId: 'server-corr-123',
        status: 'FAILED',
      });
      expect(mockPaymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: PaymentStatus.FAILED }),
        }),
      );
    });

    it('déclenche le post-traitement si transition SUCCESS réussie', async () => {
      await service.handleCallback({
        serverCorrelationId: 'server-corr-123',
        status: 'COMPLETED',
      });
      expect(mockInvoiceService.createInvoiceFromPayment).toHaveBeenCalledWith({
        paymentId: waitingPayment._id.toString(),
      });
      expect(mockCartService.softDeleteCartById).toHaveBeenCalledWith(CART_ID);
    });

    it('ne déclenche pas le post-traitement si la transition échoue (doublon callback)', async () => {
      mockPaymentRepo.transitionStatus.mockResolvedValue(false);
      await service.handleCallback({
        serverCorrelationId: 'server-corr-123',
        status: 'COMPLETED',
      });
      expect(
        mockInvoiceService.createInvoiceFromPayment,
      ).not.toHaveBeenCalled();
    });
  });

  // ── pollStatus() ────────────────────────────────────────────────────────────

  describe('pollStatus()', () => {
    it('retourne directement sans appeler Mvola si statut terminal', async () => {
      mockPaymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });
      const result = await service.pollStatus(PAYMENT_ID.toString());
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(mockMvolaApi.getTransactionStatus).not.toHaveBeenCalled();
    });

    it('lève NotFoundException si paiement introuvable', async () => {
      mockPaymentRepo.findById.mockResolvedValue(null);
      await expect(service.pollStatus('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('poll Mvola et transite vers SUCCESS si COMPLETED', async () => {
      const waitingPayment = {
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: 'server-corr-123',
        correlationId: 'corr-123',
      };
      mockPaymentRepo.findById
        .mockResolvedValueOnce(waitingPayment)
        .mockResolvedValueOnce({
          ...waitingPayment,
          status: PaymentStatus.SUCCESS,
        });
      mockMvolaApi.getTransactionStatus.mockResolvedValue({
        status: 'COMPLETED',
      });
      mockPaymentRepo.transitionStatus.mockResolvedValue(true);
      mockCartRepo.findById.mockResolvedValue(mockCart);
      mockInventoryService.stockOut.mockResolvedValue(undefined);
      mockInvoiceService.createInvoiceFromPayment.mockResolvedValue(undefined);
      mockCartService.softDeleteCartById.mockResolvedValue(undefined);

      const result = await service.pollStatus(PAYMENT_ID.toString());
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(mockPaymentRepo.transitionStatus).toHaveBeenCalledWith(
        expect.objectContaining({ toStatus: PaymentStatus.SUCCESS }),
      );
    });

    it('transite vers FAILED si Mvola retourne CANCELLED', async () => {
      const waitingPayment = {
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: 'server-corr-123',
        correlationId: 'corr-123',
      };
      mockPaymentRepo.findById
        .mockResolvedValueOnce(waitingPayment)
        .mockResolvedValueOnce({
          ...waitingPayment,
          status: PaymentStatus.FAILED,
        });
      mockMvolaApi.getTransactionStatus.mockResolvedValue({
        status: 'CANCELLED',
      });
      mockPaymentRepo.transitionStatus.mockResolvedValue(true);

      const result = await service.pollStatus(PAYMENT_ID.toString());
      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });

  // ── expire() ────────────────────────────────────────────────────────────────

  describe('expire()', () => {
    it('expire un paiement WAITING', async () => {
      mockPaymentRepo.findById
        .mockResolvedValueOnce({
          ...mockPayment,
          status: PaymentStatus.WAITING,
        })
        .mockResolvedValueOnce({
          ...mockPayment,
          status: PaymentStatus.EXPIRED,
        });
      mockPaymentRepo.update.mockResolvedValue(undefined);

      const result = await service.expire(PAYMENT_ID.toString());

      expect(mockPaymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { status: PaymentStatus.EXPIRED },
        }),
      );
      expect(result.status).toBe(PaymentStatus.EXPIRED);
    });

    it('lève BadRequestException si le paiement est déjà SUCCESS', async () => {
      mockPaymentRepo.findById.mockResolvedValue(mockPayment); // SUCCESS
      await expect(service.expire(PAYMENT_ID.toString())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève NotFoundException si paiement introuvable', async () => {
      mockPaymentRepo.findById.mockResolvedValue(null);
      await expect(service.expire(PAYMENT_ID.toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── regenerateInvoice() ──────────────────────────────────────────────────────

  describe('regenerateInvoice()', () => {
    it('lève BadRequestException si paiement non SUCCESS', async () => {
      mockPaymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });
      await expect(
        service.regenerateInvoice(PAYMENT_ID.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si une facture existe déjà', async () => {
      mockPaymentRepo.findById.mockResolvedValue(mockPayment);
      mockInvoiceService.findByPaymentId.mockResolvedValue({
        invoiceNumber: 'INV-2026-0001',
      });
      await expect(
        service.regenerateInvoice(PAYMENT_ID.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('crée la facture si paiement SUCCESS et aucune facture existante', async () => {
      mockPaymentRepo.findById.mockResolvedValue(mockPayment);
      mockInvoiceService.findByPaymentId.mockResolvedValue(null);
      mockInvoiceService.createInvoiceFromPayment.mockResolvedValue(undefined);

      await service.regenerateInvoice(PAYMENT_ID.toString());

      expect(mockInvoiceService.createInvoiceFromPayment).toHaveBeenCalledWith({
        paymentId: PAYMENT_ID.toString(),
      });
    });
  });
});
