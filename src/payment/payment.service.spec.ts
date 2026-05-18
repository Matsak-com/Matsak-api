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

const mockInvoiceService = {
  createInvoiceFromPayment: jest.fn(),
  findByPaymentId: jest.fn(),
};

const mockInventoryService = {
  stockOut: jest.fn(),
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
        {
          provide: PaymentRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            transitionStatus: jest.fn().mockResolvedValue(mockPayment),
          },
        },
        { provide: CartRepository, useValue: { findById: jest.fn() } },
        {
          provide: CartService,
          useValue: { softDeleteCartById: jest.fn() },
        },
        { provide: ProductService, useValue: { calculatePrice: jest.fn() } },
        {
          provide: MvolaApiService,
          useValue: {
            initMerchantPay: jest.fn(),
            getTransactionStatus: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
        {
          provide: InvoiceService,
          useValue: {
            createInvoiceFromPayment: jest.fn(),
            findByPaymentId: jest.fn(),
          },
        },
        { provide: InventoryService, useValue: { stockOut: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    jest.clearAllMocks();
  });

  // ── initiate() ──────────────────────────────────────────────────────────────

  describe('initiate', () => {
    // Ordre des validations dans le service :
    //   1. cart existe et non supprimé    → NotFoundException
    //   2. cart.items non vide            → BadRequestException
    //   3. deliveryAddressId si DELIVERY  → BadRequestException
    //   4. totalAmount > 0                → BadRequestException
    //   5. pas de paiement actif          → BadRequestException
    const validInput = {
      cartId: mockCartId.toString(),
      userId: mockUserId.toString(),
      customerPhone: '0340000000',
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryAddressId: ADDRESS_ID.toString(),
    };

    it('should initiate payment successfully', async () => {
      mockInitiateHappyPath();

      const result = await service.initiate(validInput);
      expect(result.status).toBe(PaymentStatus.WAITING);

      expect(cartRepo.findById).toHaveBeenCalledWith({
        id: mockCartId,
        options: { populate: [{ path: 'items.product' }] },
      });
      expect(productService.calculatePrice).toHaveBeenCalledWith(
        mockProduct,
        2,
      );
      expect(paymentRepo.findOne).toHaveBeenCalled();
      expect(paymentRepo.create).toHaveBeenCalled();
      expect(mvolaApiService.initMerchantPay).toHaveBeenCalled();
      expect(paymentRepo.update).toHaveBeenCalledWith(
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

    it('should initiate payment with PICKUP (no deliveryAddressId required)', async () => {
      const pickupInput = {
        cartId: mockCartId.toString(),
        userId: mockUserId.toString(),
        customerPhone: '0340000000',
        deliveryMethod: DeliveryMethod.PICKUP,
      };

      cartRepo.findById.mockResolvedValue(mockCart as any);
      mockPrice();
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockResolvedValue({
        ...mockPayment,
        deliveryMethod: DeliveryMethod.PICKUP,
      } as any);
      mockSuccessfulMvola();
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.WAITING,
      } as any);
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.WAITING,
      } as any);

      const result = await service.initiate(pickupInput);

      expect(result.status).toBe(PaymentStatus.WAITING);
    });

    // ── Validations dans l'ordre du service ──────────────────────────────────

    it('should throw NotFoundException when cart not found', async () => {
      cartRepo.findById.mockResolvedValue(null);

      await expect(service.initiate(validInput)).rejects.toThrow(
        NotFoundException,
      );
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when cart is soft-deleted', async () => {
      cartRepo.findById.mockResolvedValue({
        ...mockCart,
        deleted_at: new Date(),
      } as any);

      await expect(service.initiate(validInput)).rejects.toThrow(
        NotFoundException,
      );
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cart is empty', async () => {
      cartRepo.findById.mockResolvedValue({ ...mockCart, items: [] } as any);

      await expect(service.initiate(validInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when deliveryMethod is DELIVERY without deliveryAddressId', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);

      await expect(
        service.initiate({ ...input, deliveryAddressId: undefined }),
      ).rejects.toThrow(BadRequestException);
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when total amount is zero', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      productService.calculatePrice.mockReturnValue({
        basePrice: 0,
        finalPrice: 0,
        totalPrice: 0,
        discountsApplied: [],
        currency: 'Ar',
      });
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.initiate(validInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when a payment is already in progress', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      mockPrice();
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);

      await expect(service.initiate(validInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    // ── Rollback ─────────────────────────────────────────────────────────────

    it('should rollback to FAILED when Mvola API throws after payment creation', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      mockPrice();
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockResolvedValue(mockPayment as any);
      mvolaApiService.initMerchantPay.mockRejectedValue(
        new Error('Mvola initiation error'),
      );
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        amount: 456000,
      });

      await expect(service.initiate(validInput)).rejects.toThrow(
        'Mvola initiation error',
      );

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPaymentId.toString(),
          update: expect.objectContaining({
            status: PaymentStatus.FAILED,
            failureReason: 'Mvola initiation error',
          }),
        }),
      );
    });

    it('should rollback to FAILED when paymentRepo.update (→ WAITING) throws after Mvola call', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      mockPrice();
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockResolvedValue(mockPayment as any);
      mockSuccessfulMvola();
      paymentRepo.update
        .mockRejectedValueOnce(new Error('DB write error'))
        .mockResolvedValueOnce({
          ...mockPayment,
          status: PaymentStatus.FAILED,
        } as any);

      await expect(service.initiate(validInput)).rejects.toThrow(
        'DB write error',
      );

      expect(paymentRepo.update).toHaveBeenCalledTimes(2);
      expect(paymentRepo.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: mockPaymentId.toString(),
          update: expect.objectContaining({
            status: PaymentStatus.FAILED,
            failureReason: 'DB write error',
          }),
        }),
      );
    });

    it('marque le paiement FAILED en rollback si Mvola échoue', async () => {
      mockMvolaApi.initMerchantPay.mockRejectedValue(
        new Error('Mvola timeout'),
      );
      paymentRepo.update.mockRejectedValue(new Error('DB unavailable'));

      await expect(service.initiate(validInput)).rejects.toThrow(
        'Mvola unreachable',
      );
    });

    it('should NOT attempt rollback when error occurs before payment creation', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      productService.calculatePrice.mockReturnValue({
        basePrice: 0,
        finalPrice: 0,
        totalPrice: 0,
        discountsApplied: [],
        currency: 'Ar',
      });
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.initiate(validInput)).rejects.toThrow(
        BadRequestException,
      );

      expect(paymentRepo.create).not.toHaveBeenCalled();
      expect(paymentRepo.update).not.toHaveBeenCalledWith(
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

    it('should transition to SUCCESS and run post-processing on COMPLETED', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.transitionStatus.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockResolvedValue({} as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);

      await service.handleCallback(completedCallback);

      expect(paymentRepo.transitionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPaymentId.toString(),
          fromStatus: PaymentStatus.PENDING,
          toStatus: PaymentStatus.SUCCESS,
        }),
      );
      expect(inventoryService.stockOut).toHaveBeenCalled();
      // userId passé en 2ème argument, pas dans le dto
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith(
        { paymentId: mockPaymentId.toString() },
        mockUserId.toString(),
      );
      expect(cartService.softDeleteCartById).toHaveBeenCalledWith(mockCartId);
    });

    it('should pass undefined as userId when payment has no userId', async () => {
      const paymentWithoutUser = { ...mockPayment, userId: undefined };
      paymentRepo.findOne.mockResolvedValue(paymentWithoutUser as any);
      paymentRepo.transitionStatus.mockResolvedValue({
        ...paymentWithoutUser,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue({ ...mockCart, items: [] } as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);

      await service.handleCallback(completedCallback);

      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith(
        { paymentId: mockPaymentId.toString() },
        undefined,
      );
    });

    it('should skip post-processing when transitionStatus returns null (already transitioned)', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.transitionStatus.mockResolvedValue(null as any);

      await service.handleCallback(completedCallback);

      expect(inventoryService.stockOut).not.toHaveBeenCalled();
      expect(invoiceService.createInvoiceFromPayment).not.toHaveBeenCalled();
    });
  });

  // ── pollStatus() ────────────────────────────────────────────────────────────

  describe('pollStatus', () => {
    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findById.mockResolvedValue(null);
      await expect(
        service.pollStatus(mockPaymentId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return immediately when payment already in terminal state', async () => {
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });
      const result = await service.pollStatus(PAYMENT_ID.toString());
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(mockMvolaApi.getTransactionStatus).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when transaction data incomplete', async () => {
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: undefined,
      } as any);
      await expect(
        service.pollStatus(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('poll Mvola et transite vers SUCCESS si COMPLETED', async () => {
      const waitingPayment = {
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: 'server-corr-123',
        correlationId: 'corr-123',
      };

      paymentRepo.findById
        .mockResolvedValueOnce(waitingPayment as any)
        .mockResolvedValueOnce({
          ...waitingPayment,
          status: PaymentStatus.SUCCESS,
        } as any);

      mvolaApiService.getTransactionStatus.mockResolvedValue({
        status: 'COMPLETED',
      });
      mockPaymentRepo.transitionStatus.mockResolvedValue(true);
      mockCartRepo.findById.mockResolvedValue(mockCart);
      mockInventoryService.stockOut.mockResolvedValue(undefined);
      mockInvoiceService.createInvoiceFromPayment.mockResolvedValue(undefined);
      mockCartService.softDeleteCartById.mockResolvedValue(undefined);

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(mvolaApiService.getTransactionStatus).toHaveBeenCalledWith(
        'server-correlation-id',
        mockPayment.correlationId,
      );
      expect(paymentRepo.transitionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPaymentId.toString(),
          fromStatus: PaymentStatus.WAITING,
          toStatus: PaymentStatus.SUCCESS,
        }),
      );
      // userId passé en 2ème argument
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith(
        { paymentId: mockPaymentId.toString() },
        mockUserId.toString(),
      );
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(mockPaymentRepo.transitionStatus).toHaveBeenCalledWith(
        expect.objectContaining({ toStatus: PaymentStatus.SUCCESS }),
      );
    });

    it('transite vers FAILED si Mvola retourne CANCELLED', async () => {
      const waitingPayment = {
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: 'server-correlation-id',
      };

      paymentRepo.findById
        .mockResolvedValueOnce(waitingPayment as any)
        .mockResolvedValueOnce({
          ...waitingPayment,
          status: PaymentStatus.SUCCESS,
        } as any);

      mvolaApiService.getTransactionStatus.mockResolvedValue({
        status: 'COMPLETED',
        serverCorrelationId: 'server-correlation-id',
      });
      paymentRepo.transitionStatus.mockResolvedValue(null as any);

      await service.pollStatus(mockPaymentId.toString());

      expect(inventoryService.stockOut).not.toHaveBeenCalled();
      expect(invoiceService.createInvoiceFromPayment).not.toHaveBeenCalled();
    });

    it('should mark payment as FAILED when Mvola returns FAILED status', async () => {
      const waitingPayment = {
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: 'server-correlation-id',
      };

      paymentRepo.findById
        .mockResolvedValueOnce(waitingPayment as any)
        .mockResolvedValueOnce({
          ...waitingPayment,
          status: PaymentStatus.FAILED,
        } as any);

      mvolaApiService.getTransactionStatus.mockResolvedValue({
        status: 'FAILED',
        serverCorrelationId: 'server-correlation-id',
      });
      mockPaymentRepo.transitionStatus.mockResolvedValue(true);

      const result = await service.pollStatus(PAYMENT_ID.toString());
      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });

  // ── expire() ────────────────────────────────────────────────────────────────

  describe('expire', () => {
    it('should expire a PENDING payment successfully', async () => {
      paymentRepo.findById
        .mockResolvedValueOnce(mockPayment as any)
        .mockResolvedValueOnce({
          ...mockPayment,
          status: PaymentStatus.EXPIRED,
        } as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.EXPIRED,
      } as any);

      const result = await service.expire(mockPaymentId.toString());

      expect(paymentRepo.update).toHaveBeenCalledWith({
        id: mockPaymentId.toString(),
        update: { status: PaymentStatus.EXPIRED },
      });
      expect(result.status).toBe(PaymentStatus.EXPIRED);
    });

    it('should expire a WAITING payment successfully', async () => {
      const waitingPayment = { ...mockPayment, status: PaymentStatus.WAITING };
      paymentRepo.findById
        .mockResolvedValueOnce(waitingPayment as any)
        .mockResolvedValueOnce({
          ...waitingPayment,
          status: PaymentStatus.EXPIRED,
        } as any);
      paymentRepo.update.mockResolvedValue({
        ...waitingPayment,
        status: PaymentStatus.EXPIRED,
      } as any);

      const result = await service.expire(mockPaymentId.toString());

      expect(result.status).toBe(PaymentStatus.EXPIRED);
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findById.mockResolvedValue(null);
      await expect(service.expire(mockPaymentId.toString())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when payment is already SUCCESS', async () => {
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      await expect(service.expire(mockPaymentId.toString())).rejects.toThrow(
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

  describe('regenerateInvoice', () => {
    it('should regenerate invoice successfully when none exists', async () => {
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      invoiceService.findByPaymentId.mockResolvedValue(null);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-001',
      } as any);

      await service.regenerateInvoice(mockPaymentId.toString());

      // userId undefined car non fourni → currentUserId = undefined
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith(
        { paymentId: mockPaymentId.toString() },
        undefined,
      );
    });

    it('should pass userId to createInvoiceFromPayment when provided', async () => {
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      invoiceService.findByPaymentId.mockResolvedValue(null);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-001',
      } as any);

      await service.regenerateInvoice(
        mockPaymentId.toString(),
        mockUserId.toString(),
      );

      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith(
        { paymentId: mockPaymentId.toString() },
        mockUserId.toString(),
      );
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findById.mockResolvedValue(null);
      await expect(
        service.regenerateInvoice(mockPaymentId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payment is not SUCCESS', async () => {
      paymentRepo.findById.mockResolvedValue({
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
  });

  // ── deductStockFromCart (via handleCallback) ─────────────────────────────────

  describe('deductStockFromCart (via handleCallback)', () => {
    const completedCallback = {
      serverCorrelationId: 'server-correlation-id',
      status: 'COMPLETED',
    };

    const setupSuccessfulCallback = () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.transitionStatus.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);
    };

    it('should deduct stock for tracked products', async () => {
      setupSuccessfulCallback();
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockResolvedValue({} as any);

      await service.handleCallback(completedCallback);

      expect(inventoryService.stockOut).toHaveBeenCalledWith(
        {
          productId: mockProductId.toString(),
          quantity: 2,
          reason: 'Vente - Paiement réussi',
          reference: `CART-${mockCartId}`,
        },
        mockUserId.toString(),
      );
    });

    it('should skip stock deduction for non-tracked products', async () => {
      setupSuccessfulCallback();
      cartRepo.findById.mockResolvedValue({
        ...mockCart,
        items: [
          { product: { ...mockProduct, trackStock: false }, quantity: 2 },
        ],
      } as any);

      await service.handleCallback(completedCallback);

      expect(inventoryService.stockOut).not.toHaveBeenCalled();
    });

    it('should continue post-processing even if stock deduction fails', async () => {
      setupSuccessfulCallback();
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockRejectedValue(
        new Error('Insufficient stock'),
      );

      await service.handleCallback(completedCallback);

      // L'erreur stock est swallowée — facture et archivage continuent
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalled();
      expect(cartService.softDeleteCartById).toHaveBeenCalled();
    });
  });
});
