import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { CartRepository } from '../cart-item/cart.repository';
import { CartService } from '../cart-item/cart.service';
import { ProductService } from '../product/product.service';
import { MvolaApiService } from './Mvola/mvola-api.service';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from '../invoice/invoice.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentStatus, PaymentMethod, DeliveryMethod } from './payment.schema';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepo: jest.Mocked<PaymentRepository>;
  let cartRepo: jest.Mocked<CartRepository>;
  let cartService: jest.Mocked<CartService>;
  let productService: jest.Mocked<ProductService>;
  let mvolaApiService: jest.Mocked<MvolaApiService>;
  let invoiceService: jest.Mocked<InvoiceService>;
  let inventoryService: jest.Mocked<InventoryService>;

  const mockCartId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockPaymentId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const mockProductId = new Types.ObjectId('507f1f77bcf86cd799439014');
  const mockAddressId = new Types.ObjectId('507f1f77bcf86cd799439015');

  const mockProduct = {
    _id: mockProductId,
    basePrice: 1000,
    currency: 'Ar',
    trackStock: true,
    stockQuantity: 100,
  };

  const mockCart = {
    _id: mockCartId,
    userId: mockUserId,
    items: [{ product: mockProduct, quantity: 2 }],
    deleted_at: undefined,
  };

  const mockPayment = {
    _id: mockPaymentId,
    cartId: mockCartId,
    userId: mockUserId,
    method: PaymentMethod.MVOLA,
    amount: 2000,
    currency: 'Ar',
    status: PaymentStatus.PENDING,
    correlationId: 'test-correlation-id',
    transactionReference: 'test-transaction-ref',
    customerPhone: '0340000000',
    deliveryMethod: DeliveryMethod.DELIVERY,
    deliveryAddressId: mockAddressId,
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const mockPrice = () =>
    productService.calculatePrice.mockReturnValue({
      basePrice: 1000,
      finalPrice: 1000,
      totalPrice: 2000,
      discountsApplied: [],
      currency: 'Ar',
    });

  const mockSuccessfulMvola = () =>
    mvolaApiService.initMerchantPay.mockResolvedValue({
      serverCorrelationId: 'server-correlation-id',
      status: 'PENDING',
    });

  const mockInitiateHappyPath = () => {
    cartRepo.findById.mockResolvedValue(mockCart as any);
    mockPrice();
    paymentRepo.findOne.mockResolvedValue(null);
    paymentRepo.create.mockResolvedValue(mockPayment as any);
    mockSuccessfulMvola();
    paymentRepo.update.mockResolvedValue({
      ...mockPayment,
      serverCorrelationId: 'server-correlation-id',
      status: PaymentStatus.WAITING,
    } as any);
    paymentRepo.findById.mockResolvedValue({
      ...mockPayment,
      status: PaymentStatus.WAITING,
    } as any);
  };

  // ── Setup ────────────────────────────────────────────────────────────────────

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
          useValue: {
            softDeleteCartById: jest.fn(),
          },
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
    paymentRepo = module.get(PaymentRepository);
    cartRepo = module.get(CartRepository);
    cartService = module.get(CartService);
    productService = module.get(ProductService);
    mvolaApiService = module.get(MvolaApiService);
    invoiceService = module.get(InvoiceService);
    inventoryService = module.get(InventoryService);
  });

  // ── initiate ─────────────────────────────────────────────────────────────────

  describe('initiate', () => {
    // Input valide par défaut — inclut deliveryAddressId car deliveryMethod = DELIVERY
    // Ordre des validations dans le service :
    //   1. cart existe et non supprimé    → NotFoundException
    //   2. cart.items non vide            → BadRequestException
    //   3. deliveryAddressId si DELIVERY  → BadRequestException  ← vient APRÈS le cart
    //   4. totalAmount > 0                → BadRequestException
    //   5. pas de paiement actif          → BadRequestException
    const validInput = {
      cartId: mockCartId.toString(),
      userId: mockUserId.toString(),
      customerPhone: '0340000000',
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryAddressId: mockAddressId.toString(),
    };

    it('should initiate payment successfully', async () => {
      mockInitiateHappyPath();

      const result = await service.initiate(validInput);

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
          update: expect.objectContaining({
            status: PaymentStatus.WAITING,
            serverCorrelationId: 'server-correlation-id',
          }),
        }),
      );
      expect(result.status).toBe(PaymentStatus.WAITING);
    });

    it('should initiate payment with PICKUP (no deliveryAddressId required)', async () => {
      const pickupInput = {
        cartId: mockCartId.toString(),
        userId: mockUserId.toString(),
        customerPhone: '0340000000',
        deliveryMethod: DeliveryMethod.PICKUP,
        // deliveryAddressId absent — valide pour PICKUP
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
      // Cart mocké car la validation adresse vient APRÈS la validation cart (ligne 76 du service)
      cartRepo.findById.mockResolvedValue(mockCart as any);

      await expect(
        service.initiate({ ...validInput, deliveryAddressId: undefined }),
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
      paymentRepo.findOne.mockResolvedValue(mockPayment as any); // paiement actif existant

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
        status: PaymentStatus.FAILED,
      } as any);

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
      // 1er update (→ WAITING) échoue, 2ème (rollback → FAILED) réussit
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

    it('should throw original error even when rollback itself fails', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      mockPrice();
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockResolvedValue(mockPayment as any);
      mvolaApiService.initMerchantPay.mockRejectedValue(
        new Error('Mvola unreachable'),
      );
      paymentRepo.update.mockRejectedValue(new Error('DB unavailable')); // rollback échoue aussi

      // L'erreur originale doit remonter, pas l'erreur du rollback
      await expect(service.initiate(validInput)).rejects.toThrow(
        'Mvola unreachable',
      );
    });

    it('should NOT attempt rollback when error occurs before payment creation', async () => {
      // totalAmount = 0 → BadRequestException avant paymentRepo.create → paymentId est null
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

  // ── handleCallback ───────────────────────────────────────────────────────────

  describe('handleCallback', () => {
    const completedCallback = {
      serverCorrelationId: 'server-correlation-id',
      status: 'COMPLETED',
    };

    it('should ignore callback without serverCorrelationId', async () => {
      await service.handleCallback({ status: 'COMPLETED' });
      expect(paymentRepo.findOne).not.toHaveBeenCalled();
    });

    it('should ignore callback when payment not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      await service.handleCallback(completedCallback);
      expect(paymentRepo.update).not.toHaveBeenCalled();
      expect(paymentRepo.transitionStatus).not.toHaveBeenCalled();
    });

    it('should ignore duplicate callback when payment already SUCCESS', async () => {
      paymentRepo.findOne.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      await service.handleCallback(completedCallback);
      expect(paymentRepo.transitionStatus).not.toHaveBeenCalled();
    });

    it('should mark payment as FAILED on non-COMPLETED status', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      } as any);

      await service.handleCallback({
        serverCorrelationId: 'server-correlation-id',
        status: 'FAILED',
      });

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPaymentId.toString(),
          update: expect.objectContaining({
            status: PaymentStatus.FAILED,
            failureReason: 'FAILED',
            mvolaResponse: expect.any(Object),
          }),
        }),
      );
      expect(paymentRepo.transitionStatus).not.toHaveBeenCalled();
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
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith({
        paymentId: mockPaymentId.toString(),
      });
      expect(cartService.softDeleteCartById).toHaveBeenCalledWith(mockCartId);
    });

    it('should skip post-processing when transitionStatus returns null (already transitioned)', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.transitionStatus.mockResolvedValue(null as any); // un autre process a déjà transitionné

      await service.handleCallback(completedCallback);

      expect(inventoryService.stockOut).not.toHaveBeenCalled();
      expect(invoiceService.createInvoiceFromPayment).not.toHaveBeenCalled();
    });
  });

  // ── pollStatus ───────────────────────────────────────────────────────────────

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
      } as any);
      const result = await service.pollStatus(mockPaymentId.toString());
      expect(mvolaApiService.getTransactionStatus).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.SUCCESS);
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

    it('should poll Mvola and transition to SUCCESS on COMPLETED', async () => {
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
      paymentRepo.transitionStatus.mockResolvedValue({
        ...waitingPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockResolvedValue({} as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);

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
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should not run post-processing when transitionStatus returns null (race condition)', async () => {
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
      paymentRepo.transitionStatus.mockResolvedValue(null as any); // déjà pris par le callback

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
      paymentRepo.transitionStatus.mockResolvedValue({
        ...waitingPayment,
        status: PaymentStatus.FAILED,
      } as any);

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(paymentRepo.transitionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          toStatus: PaymentStatus.FAILED,
          update: expect.objectContaining({ failureReason: 'FAILED' }),
        }),
      );
      expect(inventoryService.stockOut).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });

  // ── expire ───────────────────────────────────────────────────────────────────

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

    it('should throw BadRequestException when payment is already FAILED', async () => {
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      } as any);
      await expect(service.expire(mockPaymentId.toString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── regenerateInvoice ────────────────────────────────────────────────────────

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

      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith({
        paymentId: mockPaymentId.toString(),
      });
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
      } as any);
      await expect(
        service.regenerateInvoice(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when invoice already exists', async () => {
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      invoiceService.findByPaymentId.mockResolvedValue({
        invoiceNumber: 'INV-001',
      } as any);
      await expect(
        service.regenerateInvoice(mockPaymentId.toString()),
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
