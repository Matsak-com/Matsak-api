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
import { PaymentStatus, PaymentMethod } from './payment.schema';

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
    items: [
      {
        product: mockProduct,
        quantity: 2,
      },
    ],
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
  };

  beforeEach(async () => {
    const mockPaymentRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockCartRepo = {
      findById: jest.fn(),
    };

    const mockCartService = {
      softDeleteCartById: jest.fn(),
    };

    const mockProductService = {
      calculatePrice: jest.fn(),
    };

    const mockMvolaApiService = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: mockPaymentRepo,
        },
        {
          provide: CartRepository,
          useValue: mockCartRepo,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: MvolaApiService,
          useValue: mockMvolaApiService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
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

  describe('initiate', () => {
    const initiateInput = {
      cartId: mockCartId.toString(),
      userId: mockUserId.toString(),
      customerPhone: '0340000000',
    };

    it('should initiate payment successfully', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      productService.calculatePrice.mockReturnValue({
        basePrice: 1000,
        finalPrice: 1000,
        totalPrice: 2000,
        discountsApplied: [],
        currency: 'Ar',
      });
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockResolvedValue(mockPayment as any);
      mvolaApiService.initMerchantPay.mockResolvedValue({
        serverCorrelationId: 'server-correlation-id',
        status: 'PENDING',
      });
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        serverCorrelationId: 'server-correlation-id',
        status: PaymentStatus.WAITING,
      } as any);
      paymentRepo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.WAITING,
      } as any);

      const result = await service.initiate(initiateInput);

      expect(cartRepo.findById).toHaveBeenCalledWith({
        id: mockCartId,
        options: { populate: [{ path: 'items.product' }] },
      });
      expect(productService.calculatePrice).toHaveBeenCalledWith(
        mockProduct,
        2,
      );
      expect(paymentRepo.create).toHaveBeenCalled();
      expect(mvolaApiService.initMerchantPay).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.WAITING);
    });

    it('should throw NotFoundException when cart not found', async () => {
      cartRepo.findById.mockResolvedValue(null);

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when cart is deleted', async () => {
      cartRepo.findById.mockResolvedValue({
        ...mockCart,
        deleted_at: new Date(),
      } as any);

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when cart is empty', async () => {
      cartRepo.findById.mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when total amount is zero', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      productService.calculatePrice.mockReturnValue({
        basePrice: 1000,
        finalPrice: 0,
        totalPrice: 0,
        discountsApplied: [],
        currency: 'Ar',
      });

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when payment already in progress', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      productService.calculatePrice.mockReturnValue({
        basePrice: 1000,
        finalPrice: 1000,
        totalPrice: 2000,
        discountsApplied: [],
        currency: 'Ar',
      });
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback payment to FAILED when Mvola API throws after creation', async () => {
      cartRepo.findById.mockResolvedValue(mockCart as any);
      productService.calculatePrice.mockReturnValue({
        basePrice: 1000,
        finalPrice: 1000,
        totalPrice: 2000,
        discountsApplied: [],
        currency: 'Ar',
      });
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockResolvedValue(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      } as any);
      mvolaApiService.initMerchantPay.mockRejectedValue(
        new Error('Mvola initiation error'),
      );

      await expect(service.initiate(initiateInput)).rejects.toThrow();

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPayment._id,
          update: expect.objectContaining({
            status: PaymentStatus.FAILED,
          }),
        }),
      );
    });
  });

  describe('handleCallback', () => {
    const callbackData = {
      serverCorrelationId: 'server-correlation-id',
      status: 'COMPLETED',
    };

    it('should handle successful payment callback', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockResolvedValue({} as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-202602-0001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);

      await service.handleCallback(callbackData);

      expect(paymentRepo.findOne).toHaveBeenCalledWith({
        filter: { serverCorrelationId: 'server-correlation-id' },
      });
      expect(paymentRepo.update).toHaveBeenCalledWith({
        id: mockPaymentId.toString(),
        update: {
          status: PaymentStatus.SUCCESS,
          mvolaResponse: callbackData,
        },
      });
      expect(inventoryService.stockOut).toHaveBeenCalled();
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalled();
      expect(cartService.softDeleteCartById).toHaveBeenCalledWith(mockCartId);
    });

    it('should handle failed payment callback', async () => {
      const failedCallbackData = {
        serverCorrelationId: 'server-correlation-id',
        status: 'FAILED',
      };

      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      } as any);

      await service.handleCallback(failedCallbackData);

      expect(paymentRepo.update).toHaveBeenCalledWith({
        id: mockPaymentId.toString(),
        update: {
          status: PaymentStatus.FAILED,
          mvolaResponse: failedCallbackData,
          failureReason: 'FAILED',
        },
      });
      expect(inventoryService.stockOut).not.toHaveBeenCalled();
      expect(invoiceService.createInvoiceFromPayment).not.toHaveBeenCalled();
    });

    it('should ignore callback without serverCorrelationId', async () => {
      const invalidCallbackData = { status: 'COMPLETED' };

      await service.handleCallback(invalidCallbackData);

      expect(paymentRepo.findOne).not.toHaveBeenCalled();
    });

    it('should warn when payment not found for callback', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await service.handleCallback(callbackData);

      expect(paymentRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('pollStatus', () => {
    it('should poll and update payment status to SUCCESS', async () => {
      const waitingPayment = {
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: 'server-correlation-id',
      };

      paymentRepo.findById.mockResolvedValueOnce(waitingPayment as any);
      mvolaApiService.getTransactionStatus.mockResolvedValue({
        status: 'COMPLETED',
        serverCorrelationId: 'server-correlation-id',
      });
      paymentRepo.update.mockResolvedValue({
        ...waitingPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockResolvedValue({} as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-202602-0001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);
      paymentRepo.findById.mockResolvedValueOnce({
        ...waitingPayment,
        status: PaymentStatus.SUCCESS,
      } as any);

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(mvolaApiService.getTransactionStatus).toHaveBeenCalledWith(
        'server-correlation-id',
        mockPayment.correlationId,
      );
      expect(paymentRepo.update).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should return payment if already completed', async () => {
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      };

      paymentRepo.findById.mockResolvedValue(completedPayment as any);

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(mvolaApiService.getTransactionStatus).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findById.mockResolvedValue(null);

      await expect(
        service.pollStatus(mockPaymentId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction data incomplete', async () => {
      const incompletePayment = {
        ...mockPayment,
        status: PaymentStatus.WAITING,
        serverCorrelationId: undefined,
      };

      paymentRepo.findById.mockResolvedValue(incompletePayment as any);

      await expect(
        service.pollStatus(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('expire', () => {
    it('should expire pending payment successfully', async () => {
      paymentRepo.findById.mockResolvedValueOnce(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.EXPIRED,
      } as any);
      paymentRepo.findById.mockResolvedValueOnce({
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

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findById.mockResolvedValue(null);

      await expect(service.expire(mockPaymentId.toString())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when payment already completed', async () => {
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      };

      paymentRepo.findById.mockResolvedValue(completedPayment as any);

      await expect(service.expire(mockPaymentId.toString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('regenerateInvoice', () => {
    it('should regenerate invoice successfully', async () => {
      const successfulPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      };

      paymentRepo.findById.mockResolvedValue(successfulPayment as any);
      invoiceService.findByPaymentId.mockResolvedValue(null);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-202602-0001',
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

    it('should throw BadRequestException when payment not successful', async () => {
      const failedPayment = {
        ...mockPayment,
        status: PaymentStatus.FAILED,
      };

      paymentRepo.findById.mockResolvedValue(failedPayment as any);

      await expect(
        service.regenerateInvoice(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when invoice already exists', async () => {
      const successfulPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      };

      paymentRepo.findById.mockResolvedValue(successfulPayment as any);
      invoiceService.findByPaymentId.mockResolvedValue({
        invoiceNumber: 'INV-202602-0001',
      } as any);

      await expect(
        service.regenerateInvoice(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deductStockFromCart (via handleCallback)', () => {
    it('should deduct stock for all products in cart', async () => {
      const callbackData = {
        serverCorrelationId: 'server-correlation-id',
        status: 'COMPLETED',
      };

      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockResolvedValue({} as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-202602-0001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);

      await service.handleCallback(callbackData);

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

    it('should skip products without stock tracking', async () => {
      const callbackData = {
        serverCorrelationId: 'server-correlation-id',
        status: 'COMPLETED',
      };

      const cartWithNonTrackedProduct = {
        ...mockCart,
        items: [
          {
            product: { ...mockProduct, trackStock: false },
            quantity: 2,
          },
        ],
      };

      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue(cartWithNonTrackedProduct as any);
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-202602-0001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);

      await service.handleCallback(callbackData);

      expect(inventoryService.stockOut).not.toHaveBeenCalled();
    });

    it('should continue processing even if stock deduction fails', async () => {
      const callbackData = {
        serverCorrelationId: 'server-correlation-id',
        status: 'COMPLETED',
      };

      paymentRepo.findOne.mockResolvedValue(mockPayment as any);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as any);
      cartRepo.findById.mockResolvedValue(mockCart as any);
      inventoryService.stockOut.mockRejectedValue(
        new Error('Insufficient stock'),
      );
      invoiceService.createInvoiceFromPayment.mockResolvedValue({
        invoiceNumber: 'INV-202602-0001',
      } as any);
      cartService.softDeleteCartById.mockResolvedValue(undefined);

      await service.handleCallback(callbackData);

      // Should still create invoice despite stock error
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalled();
      expect(cartService.softDeleteCartById).toHaveBeenCalled();
    });
  });
});