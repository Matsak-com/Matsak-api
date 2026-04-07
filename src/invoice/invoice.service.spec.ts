import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { NotificationService } from '../notifications/notification.service';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoiceStatus } from './invoice.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Payment } from '../payment/payment.schema';
import { Cart } from '../cart-item/cart-item.schema';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: jest.Mocked<InvoiceRepository>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockPaymentId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockCartId = new Types.ObjectId('507f1f77bcf86cd799439013');

  const mockInvoice = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
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
          provide: getModelToken(Payment.name),
          useValue: { findById: jest.fn() },
        },
        {
          provide: getModelToken(Cart.name),
          useValue: { findByIdAndUpdate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceRepo = module.get(InvoiceRepository);
    notificationService = module.get(NotificationService);
  });

  // ─── createInvoiceFromPayment ─────────────────────────────────────────────

  describe('createInvoiceFromPayment', () => {
    const mockCart = {
      _id: mockCartId,
      sessionId: 'session-123',
      items: [{ product: new Types.ObjectId(), quantity: 2 }],
    };

    const mockPayment = {
      _id: mockPaymentId,
      userId: mockUserId,
      cartId: mockCart,
    };

    beforeEach(() => {
      (service as any).paymentModel = {
        findById: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockPayment),
          }),
        }),
      };
      (service as any).cartModel = {
        findByIdAndUpdate: jest.fn().mockResolvedValue(null),
      };
    });

    it('should create invoice successfully', async () => {
      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);

      const result = await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
      });

      expect(invoiceRepo.generateInvoiceNumber).toHaveBeenCalled();
      expect(invoiceRepo.create).toHaveBeenCalledWith({
        doc: expect.objectContaining({
          payment: expect.any(Types.ObjectId),
          userId: mockUserId,
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

    it('should not soft delete cart if invoice creation fails', async () => {
      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createInvoiceFromPayment({
          paymentId: mockPaymentId.toString(),
        }),
      ).rejects.toThrow();

      expect(
        (service as any).cartModel.findByIdAndUpdate,
      ).not.toHaveBeenCalled();
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
    it('should update invoice status to refunded with refundedAt', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.REFUNDED,
        refundedAt: new Date(),
      };

      invoiceRepo.findById.mockResolvedValue(mockInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      const result = await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.REFUNDED,
      );

      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: expect.objectContaining({
          status: InvoiceStatus.REFUNDED,
          refundedAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe(InvoiceStatus.REFUNDED);
    });

    it('should update invoice status to cancelled without refundedAt', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      };

      invoiceRepo.findById.mockResolvedValue(mockInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      const result = await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.CANCELLED,
      );

      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: { status: InvoiceStatus.CANCELLED },
      });
      expect(result.status).toBe(InvoiceStatus.CANCELLED);
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
    it('should soft delete invoice', async () => {
      invoiceRepo.findById.mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue({
        ...mockPopulatedInvoice,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString());

      expect(invoiceRepo.findById).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        options: expect.objectContaining({ populate: expect.any(Array) }),
      });
      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: { deleted_at: expect.any(Date) },
      });
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

      // L'email est fire-and-forget, on attend la résolution des promises pendantes
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
});
