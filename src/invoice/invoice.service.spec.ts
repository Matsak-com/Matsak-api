import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { NotificationService } from '../notifications/notification.service';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoiceStatus } from './invoice.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Payment } from '../payment/payment.schema';
import { PricingService } from '../pricing/pricing.service';
import { User } from '../users/user.schema';
import { Member } from '../members/member.schema';
import { Role } from '../roles/role.schema';
import { HistoryService } from '../history/history.service';
import { HistoryAction, HistoryEntityType } from '../history/history.schema';
import { DeliveryCheckService } from './delivery-check.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: jest.Mocked<InvoiceRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let historyService: jest.Mocked<HistoryService>;

  const mockPaymentId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockCartId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const mockInvoiceId = new Types.ObjectId('507f1f77bcf86cd799439014');
  const mockCurrentUserId = '507f1f77bcf86cd799439020';

  const mockInvoice = {
    _id: mockInvoiceId,
    payment: mockPaymentId,
    userId: mockUserId,
    invoiceNumber: 'INV-2024-001',
    status: InvoiceStatus.PAID,
    invoiceDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockPopulatedInvoice = {
    ...mockInvoice,
    cartSnapshot: {
      cartId: mockCartId,
      sessionId: undefined,
      items: [{ product: new Types.ObjectId(), quantity: 2 }],
      snapshotAt: new Date('2024-01-15'),
    },
    payment: {
      _id: mockPaymentId,
      method: 'mvola',
      amount: 50000,
      currency: 'MGA',
      status: 'completed',
      deliveryMethod: 'delivery',
      deliveryAddressId: null,
      correlationId: 'corr-123',
      customerPhone: '0341234567',
      transactionReference: 'TXN-123',
      serverCorrelationId: 'server-corr-123',
      mvolaResponse: {},
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      userId: {
        _id: mockUserId,
        name: 'John Doe',
        email: 'john@example.com',
        addresses: [
          {
            street: '123 Main St',
            city: 'Antananarivo',
            isDefault: true,
          },
        ],
      },
      cartId: {
        _id: mockCartId,
        items: [
          {
            product: {
              _id: new Types.ObjectId(),
              name: 'Product 1',
              detail: { description: 'Description 1' },
            },
            quantity: 2,
            price: 25000,
          },
        ],
      },
    },
  };

  beforeEach(async () => {
    const mockInvoiceRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      generateInvoiceNumber: jest.fn(),
    };

    const mockNotificationService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const mockHistoryService = {
      recordAsync: jest.fn().mockResolvedValue(undefined),
    };

    const mockPricingService = {
      calculateTotal: jest.fn().mockResolvedValue({
        currency: 'MGA',
        exchangeRate: 4800,
        exchangeRateSnapshotAt: new Date(),
        subtotalEur: 0,
        subtotalLocal: 0,
        pricingLines: [],
        surchargesTotalEur: 0,
        surchargesTotalLocal: 0,
        discountEur: 0,
        discountLocal: 0,
        promoCodeSnapshot: null,
        totalEur: 0,
        totalLocal: 0,
      }),
      redeemPromoCode: jest.fn().mockResolvedValue(null),
    };

    const mockDeliveryCheckService = {
      createDeliveryToken: jest.fn().mockResolvedValue('mock-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: InvoiceRepository,
          useValue: mockInvoiceRepo,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: HistoryService,
          useValue: mockHistoryService,
        },
        {
          provide: DeliveryCheckService,
          useValue: mockDeliveryCheckService,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: { findById: jest.fn() },
        },
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
        {
          provide: getModelToken(User.name),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getModelToken(Member.name),
          useValue: { find: jest.fn(), countDocuments: jest.fn() },
        },
        {
          provide: getModelToken(Role.name),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceRepo = module.get(InvoiceRepository);
    notificationService = module.get(NotificationService);
    historyService = module.get(HistoryService);
  });

  // ─── createInvoiceFromPayment ─────────────────────────────────────────────

  describe('createInvoiceFromPayment', () => {
    const mockCart = {
      _id: mockCartId,
      sessionId: 'session-123',
      items: [
        {
          product: {
            _id: new Types.ObjectId(),
            basePrice: 25000,
            currency: 'MGA',
            detail: { name: 'Produit 1', description: 'Desc 1' },
            team: { _id: new Types.ObjectId(), name: 'Équipe A' },
          },
          quantity: 2,
        },
      ],
    };

    const mockPayment = {
      _id: mockPaymentId,
      userId: mockUserId,
      cartId: mockCart,
      deliveryMethod: 'delivery',
      pricingSnapshot: {
        currency: 'MGA',
        exchangeRate: 4800,
        exchangeRateSnapshotAt: new Date(),
        subtotalEur: 0,
        subtotalLocal: 0,
        pricingLines: [],
        surchargesTotalEur: 0,
        surchargesTotalLocal: 0,
        discountEur: 0,
        discountLocal: 0,
        promoCodeSnapshot: null,
        totalEur: 0,
        totalLocal: 0,
      },
      amount: 0,
    };

    beforeEach(() => {
      (service as any).paymentModel = {
        findById: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockPayment),
          }),
        }),
      };
    });

    it('should create invoice successfully and record history', async () => {
      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      const result = await service.createInvoiceFromPayment(
        { paymentId: mockPaymentId.toString() },
        mockCurrentUserId,
      );

      expect(invoiceRepo.generateInvoiceNumber).toHaveBeenCalled();
      expect(invoiceRepo.create).toHaveBeenCalledWith({
        doc: expect.objectContaining({
          payment: expect.any(Types.ObjectId),
          userId: mockUserId,
          createdBy: new Types.ObjectId(mockCurrentUserId),
          cartSnapshot: expect.objectContaining({
            cartId: mockCartId,
            sessionId: 'session-123',
            items: expect.any(Array),
            snapshotAt: expect.any(Date),
          }),
          invoiceNumber: 'INV-2024-001',
          status: InvoiceStatus.PAID,
          invoiceDate: expect.any(Date),
        }),
      });
      expect(result).toEqual(mockInvoice);
    });

    // ─── createInvoiceFromPayment ─────────────────────────────────────────────
    it('should record CREATED history entry after successful creation', async () => {
      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      await service.createInvoiceFromPayment(
        { paymentId: mockPaymentId.toString() },
        mockCurrentUserId,
      );

      expect(historyService.recordAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: HistoryEntityType.INVOICE,
          entityId: mockInvoice._id,
          entityLabel: 'INV-2024-001',
          action: HistoryAction.CREATED,       // ← CREATED, not STATUS_CHANGED
          performedBy: mockCurrentUserId,
          isSystemAction: false,
          newValue: expect.objectContaining({
            invoiceNumber: 'INV-2024-001',
            status: InvoiceStatus.PAID,
          }),
          metadata: expect.objectContaining({
            paymentId: mockPaymentId.toString(),
            cartId: mockCartId.toString(),
          }),
        }),
      );
    });

    it('should mark history as system action when no currentUserId is provided', async () => {
      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
      });

      expect(historyService.recordAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          performedBy: undefined,
          isSystemAction: true,
        }),
      );
    });

    it('should not set createdBy when no currentUserId is provided', async () => {
      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
      });

      const createCall = invoiceRepo.create.mock.calls[0][0];
      expect(createCall.doc.createdBy).toBeUndefined();
    });

    it('should throw NotFoundException when payment not found', async () => {
      (service as any).paymentModel = {
        findById: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      };

      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');

      await expect(
        service.createInvoiceFromPayment({
          paymentId: mockPaymentId.toString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should retry on invoiceNumber collision (code 11000)', async () => {
      invoiceRepo.generateInvoiceNumber
        .mockResolvedValueOnce('INV-2024-001')
        .mockResolvedValueOnce('INV-2024-002');

      invoiceRepo.create
        .mockRejectedValueOnce({ code: 11000 })
        .mockResolvedValueOnce(mockInvoice as any);

      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      const result = await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
      });

      expect(invoiceRepo.generateInvoiceNumber).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockInvoice);
    });

    it('should throw error when invoice creation fails with non-duplicate error', async () => {
      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createInvoiceFromPayment({
          paymentId: mockPaymentId.toString(),
        }),
      ).rejects.toThrow('Database error');
    });

    it('should redeem promo code when provided and promoCodeSnapshot exists', async () => {
      const pricingService = (service as any)
        .pricingService as jest.Mocked<PricingService>;
      pricingService.calculateTotal.mockResolvedValue({
        currency: 'MGA',
        exchangeRate: 4800,
        exchangeRateSnapshotAt: new Date(),
        subtotalEur: 100,
        subtotalLocal: 480000,
        pricingLines: [],
        surchargesTotalEur: 0,
        surchargesTotalLocal: 0,
        discountEur: 10,
        discountLocal: 48000,
        promoCodeSnapshot: { code: 'PROMO10', discountPercent: 10 },
        totalEur: 90,
        totalLocal: 432000,
      } as any);

      // Override paymentModel to return a payment with a promoCodeSnapshot
      (service as any).paymentModel = {
        findById: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
              ...mockPayment,
              pricingSnapshot: {
                ...mockPayment.pricingSnapshot,
                subtotalEur: 100,
                promoCodeSnapshot: { code: 'PROMO10', discountPercent: 10 },
              },
            }),
          }),
        }),
      };

      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
        promoCode: 'PROMO10',
      });

      expect(pricingService.redeemPromoCode).toHaveBeenCalledWith(
        'PROMO10',
        100,
        expect.any(String),
      );
    });

    it('should not redeem promo code when promoCodeSnapshot is null', async () => {
      const pricingService = (service as any)
        .pricingService as jest.Mocked<PricingService>;

      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
        promoCode: 'INVALID',
      });

      expect(pricingService.redeemPromoCode).not.toHaveBeenCalled();
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return enriched invoice data', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      const result = await service.findOne(mockInvoice._id.toString());

      expect(invoiceRepo.findById).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        options: expect.objectContaining({
          populate: expect.any(Array),
        }),
      });
      expect(result._id).toEqual(mockInvoice._id);
      expect(result.userId).toBe(mockUserId.toString());
      expect(result.invoiceNumber).toBe('INV-2024-001');
      expect(result.payment).toBeDefined();
      expect(result.cart._id).toEqual(mockCartId);
      expect(result.customer).toBeDefined();
      expect(result.customer.name).toBe('John Doe');
      expect(result.customer.defaultShippingAddress).toBeDefined();
    });

    it('should use cartSnapshot items when available', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      const result = await service.findOne(mockInvoice._id.toString());

      expect(result.cart.items).toEqual(
        mockPopulatedInvoice.cartSnapshot.items,
      );
    });

    it('should fallback to payment.cartId items when cartSnapshot has no items', async () => {
      const invoiceWithoutSnapshot = {
        ...mockPopulatedInvoice,
        cartSnapshot: { cartId: mockCartId, items: [], snapshotAt: new Date() },
      };
      invoiceRepo.findById.mockResolvedValue(invoiceWithoutSnapshot as any);

      const result = await service.findOne(mockInvoice._id.toString());

      expect(result.cart.items).toEqual(
        mockPopulatedInvoice.payment.cartId.items,
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(mockInvoice._id.toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findByInvoiceNumber ──────────────────────────────────────────────────

  describe('findByInvoiceNumber', () => {
    it('should return invoice by invoice number', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockPopulatedInvoice as any);

      const result = await service.findByInvoiceNumber('INV-2024-001');

      expect(invoiceRepo.findOne).toHaveBeenCalledWith({
        filter: { invoiceNumber: 'INV-2024-001' },
        options: expect.objectContaining({
          populate: expect.any(Array),
        }),
      });
      expect(result.invoiceNumber).toBe('INV-2024-001');
    });

    it('should throw NotFoundException when invoice number not found', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.findByInvoiceNumber('INV-9999-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findByPaymentId ──────────────────────────────────────────────────────

  describe('findByPaymentId', () => {
    it('should return invoice by payment ID', async () => {
      invoiceRepo.findOne.mockResolvedValue(mockInvoice as any);

      const result = await service.findByPaymentId(mockPaymentId.toString());

      expect(invoiceRepo.findOne).toHaveBeenCalledWith({
        filter: { payment: expect.any(Types.ObjectId) },
      });
      expect(result).toEqual(mockInvoice);
    });

    it('should return null when invoice not found', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);

      const result = await service.findByPaymentId(mockPaymentId.toString());

      expect(result).toBeNull();
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should update invoice status to REFUNDED with refundedAt and updatedBy', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.REFUNDED,
        refundedAt: new Date(),
      };

      invoiceRepo.findById
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      const result = await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.REFUNDED,
        mockCurrentUserId,
      );

      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: expect.objectContaining({
          status: InvoiceStatus.REFUNDED,
          refundedAt: expect.any(Date),
          updatedBy: new Types.ObjectId(mockCurrentUserId),
        }),
      });
      expect(result.status).toBe(InvoiceStatus.REFUNDED);
    });

    it('should update invoice status to CANCELLED without refundedAt', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      };

      invoiceRepo.findById
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      const result = await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.CANCELLED,
        mockCurrentUserId,
      );

      const updateCall = invoiceRepo.update.mock.calls[0][0];
      expect(updateCall.update).not.toHaveProperty('refundedAt');
      expect(updateCall.update.status).toBe(InvoiceStatus.CANCELLED);
      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should not set updatedBy when no currentUserId is provided', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      };

      invoiceRepo.findById
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.CANCELLED,
      );

      const updateCall = invoiceRepo.update.mock.calls[0][0];
      expect(updateCall.update.updatedBy).toBeUndefined();
    });

    it('should record STATUS_CHANGED history with previous and new status', async () => {
      const updatedInvoice = { ...mockInvoice, status: InvoiceStatus.REFUNDED };

      invoiceRepo.findById
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.REFUNDED,
        mockCurrentUserId,
      );

      expect(historyService.recordAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: HistoryEntityType.INVOICE,
          entityId: new Types.ObjectId(mockInvoice._id.toString()),
          entityLabel: mockInvoice.invoiceNumber,
          action: HistoryAction.STATUS_CHANGED,
          performedBy: mockCurrentUserId,
          previousValue: { status: InvoiceStatus.PAID },
          newValue: expect.objectContaining({ status: InvoiceStatus.REFUNDED }),
          changedFields: ['status', 'refundedAt', 'updatedBy'], // REFUNDED + currentUserId provided
          metadata: expect.objectContaining({
            previousStatus: InvoiceStatus.PAID,
            newStatus: InvoiceStatus.REFUNDED,
          }),
        }),
      );
    });

    it('should include refundedAt in history newValue when status is REFUNDED', async () => {
      const updatedInvoice = { ...mockInvoice, status: InvoiceStatus.REFUNDED };

      invoiceRepo.findById
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.REFUNDED,
        mockCurrentUserId,
      );

      const historyCall = historyService.recordAsync.mock.calls[0][0];
      expect(historyCall.newValue).toHaveProperty('refundedAt');
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          mockInvoice._id.toString(),
          InvoiceStatus.REFUNDED,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findByCustomer ───────────────────────────────────────────────────────

  describe('findByCustomer', () => {
    it('should query repository with correct userId filter', async () => {
      invoiceRepo.findAll.mockResolvedValue([mockPopulatedInvoice] as any);

      const result = await service.findByCustomer(mockUserId.toString());

      expect(invoiceRepo.findAll).toHaveBeenCalledWith({
        filter: {
          userId: expect.any(Types.ObjectId),
          deleted_at: { $exists: false },
        },
        options: expect.objectContaining({
          sort: { invoiceDate: -1 },
          populate: expect.any(Array),
        }),
      });

      const callArgs = invoiceRepo.findAll.mock.calls[0][0];
      expect(callArgs.filter.userId.toString()).toBe(mockUserId.toString());
      expect(result.length).toBe(1);
      expect(result[0].customer.name).toBe('John Doe');
    });

    it('should return empty array when customer has no invoices', async () => {
      invoiceRepo.findAll.mockResolvedValue([]);

      const result = await service.findByCustomer(mockUserId.toString());

      expect(result).toEqual([]);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete invoice with deletedBy and updatedBy', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue({
        ...mockPopulatedInvoice,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString(), mockCurrentUserId);

      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: expect.objectContaining({
          deleted_at: expect.any(Date),
          deletedBy: new Types.ObjectId(mockCurrentUserId),
          updatedBy: new Types.ObjectId(mockCurrentUserId),
        }),
      });
    });

    it('should soft delete without deletedBy and updatedBy when no currentUserId', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue({
        ...mockPopulatedInvoice,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString());

      const updateCall = invoiceRepo.update.mock.calls[0][0];
      expect(updateCall.update.deletedBy).toBeUndefined();
      expect(updateCall.update.updatedBy).toBeUndefined();
      expect(updateCall.update.deleted_at).toBeInstanceOf(Date);
    });

    it('should record DELETED history with previous invoice snapshot', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue({
        ...mockPopulatedInvoice,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString(), mockCurrentUserId);

      expect(historyService.recordAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: HistoryEntityType.INVOICE,
          entityId: new Types.ObjectId(mockInvoice._id.toString()),
          entityLabel: mockInvoice.invoiceNumber,
          action: HistoryAction.DELETED,
          performedBy: mockCurrentUserId,
          previousValue: expect.objectContaining({
            status: mockInvoice.status,
            invoiceNumber: mockInvoice.invoiceNumber,
          }),
          changedFields: ['deleted_at', 'deletedBy'],
          metadata: expect.objectContaining({
            deletedAt: expect.any(Date),
            customerEmail: 'john@example.com',
            customerName: 'John Doe',
          }),
        }),
      );
    });

    it('should call findOne (via findById) before soft-deleting to capture snapshot', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue({
        ...mockPopulatedInvoice,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString(), mockCurrentUserId);

      expect(invoiceRepo.findById.mock.invocationCallOrder[0]).toBeLessThan(
        invoiceRepo.update.mock.invocationCallOrder[0],
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(service.remove(mockInvoice._id.toString())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should send deletion email when customer has email', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue({
        ...mockPopulatedInvoice,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString());

      await Promise.resolve();

      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          template: 'invoice-deleted',
          locale: 'fr',
          context: expect.objectContaining({
            user: expect.objectContaining({
              name: 'John Doe',
              email: 'john@example.com',
            }),
            invoice: expect.objectContaining({
              number: 'INV-2024-001',
              currency: 'MGA',
            }),
          }),
        }),
      );
    });

    it('should not send email when customer has no email', async () => {
      const invoiceWithoutEmail = {
        ...mockPopulatedInvoice,
        payment: {
          ...mockPopulatedInvoice.payment,
          userId: {
            ...mockPopulatedInvoice.payment.userId,
            email: null,
          },
        },
      };

      invoiceRepo.findById.mockResolvedValue(invoiceWithoutEmail as any);
      invoiceRepo.update.mockResolvedValue({
        ...invoiceWithoutEmail,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString());

      await Promise.resolve();

      expect(notificationService.sendEmail).not.toHaveBeenCalled();
    });
  });

  // ─── findByTeam ───────────────────────────────────────────────────────────

  describe('findByTeam', () => {
    const mockTeamId = new Types.ObjectId('507f1f77bcf86cd799439099');

    const mockInvoiceWithTeam = {
      ...mockPopulatedInvoice,
      cartSnapshot: {
        cartId: mockCartId,
        sessionId: 'session-123',
        snapshotAt: new Date('2024-01-15'),
        items: [
          {
            product: {
              _id: new Types.ObjectId(),
              name: 'Produit équipe A',
              description: 'Desc A',
              team: { _id: mockTeamId, name: 'Équipe A' },
            },
            quantity: 2,
            price: 15000,
          },
          {
            product: {
              _id: new Types.ObjectId(),
              name: 'Produit autre équipe',
              description: 'Desc B',
              team: { _id: new Types.ObjectId(), name: 'Équipe B' },
            },
            quantity: 1,
            price: 10000,
          },
        ],
      },
    };

    it('should query repository with correct team filter and exclude soft-deleted', async () => {
      invoiceRepo.findAll.mockResolvedValue([mockInvoiceWithTeam] as any);

      await service.findByTeam(mockTeamId.toString());

      expect(invoiceRepo.findAll).toHaveBeenCalledWith({
        filter: {
          'cartSnapshot.items.product.team._id': expect.any(Types.ObjectId),
          deleted_at: { $exists: false },
        },
        options: expect.objectContaining({
          sort: { invoiceDate: -1 },
          populate: expect.any(Array),
        }),
      });

      const callFilter = invoiceRepo.findAll.mock.calls[0][0].filter;
      expect(callFilter['cartSnapshot.items.product.team._id'].toString()).toBe(
        mockTeamId.toString(),
      );
    });

    it('should return only items belonging to the requested team', async () => {
      invoiceRepo.findAll.mockResolvedValue([mockInvoiceWithTeam] as any);

      const result = await service.findByTeam(mockTeamId.toString());

      expect(result).toHaveLength(1);
      const teamItems = result[0].cart.items;
      expect(teamItems).toHaveLength(1);
      expect(teamItems[0].product.team._id.toString()).toBe(
        mockTeamId.toString(),
      );
      expect(teamItems[0].product.name).toBe('Produit équipe A');
    });

    it('should include a correct teamSummary with subtotal and itemCount', async () => {
      invoiceRepo.findAll.mockResolvedValue([mockInvoiceWithTeam] as any);

      const result = await service.findByTeam(mockTeamId.toString());

      expect(result[0].teamSummary).toBeDefined();
      expect(result[0].teamSummary.teamId).toBe(mockTeamId.toString());
      // 2 items × 15 000 Ar = 30 000 Ar
      expect(result[0].teamSummary.subtotalRaw).toBe(30000);
      expect(result[0].teamSummary.itemCount).toBe(1);
      expect(result[0].teamSummary.subtotal).toBe('30\u202f000'); // formatage fr-FR
    });

    it('should return empty array when no invoices match the team', async () => {
      invoiceRepo.findAll.mockResolvedValue([]);

      const result = await service.findByTeam(mockTeamId.toString());

      expect(result).toEqual([]);
    });

    it('should return teamSummary with zero subtotal when team has no matching items', async () => {
      const invoiceNoMatchingItems = {
        ...mockPopulatedInvoice,
        cartSnapshot: {
          ...mockPopulatedInvoice.cartSnapshot,
          items: [
            {
              product: {
                _id: new Types.ObjectId(),
                name: 'Produit autre équipe',
                team: { _id: new Types.ObjectId(), name: 'Équipe B' },
              },
              quantity: 3,
              price: 5000,
            },
          ],
        },
      };

      invoiceRepo.findAll.mockResolvedValue([invoiceNoMatchingItems] as any);

      const result = await service.findByTeam(mockTeamId.toString());

      expect(result[0].teamSummary.itemCount).toBe(0);
      expect(result[0].teamSummary.subtotalRaw).toBe(0);
      expect(result[0].cart.items).toHaveLength(0);
    });
  });
});
