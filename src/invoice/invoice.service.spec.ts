import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoiceStatus } from './invoice.schema'; // ← ajout

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: jest.Mocked<InvoiceRepository>;

  const mockPaymentId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockCartId = new Types.ObjectId('507f1f77bcf86cd799439013');

  const mockInvoice = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
    payment: mockPaymentId,
    invoiceNumber: 'INV-2024-001',
    status: InvoiceStatus.PAID, // ← fix
    invoiceDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockPopulatedInvoice = {
    ...mockInvoice,
    payment: {
      _id: mockPaymentId,
      method: 'mvola',
      amount: 50000,
      currency: 'MGA',
      status: 'completed',
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
              detail: {
                description: 'Description 1',
              },
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: InvoiceRepository,
          useValue: mockInvoiceRepo,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceRepo = module.get(InvoiceRepository);
  });

  describe('createInvoiceFromPayment', () => {
    it('should create invoice successfully', async () => {
      const createDto = {
        paymentId: mockPaymentId.toString(),
      };

      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockResolvedValue(mockInvoice as any);

      const result = await service.createInvoiceFromPayment(createDto);

      expect(invoiceRepo.generateInvoiceNumber).toHaveBeenCalled();
      expect(invoiceRepo.create).toHaveBeenCalledWith({
        doc: expect.objectContaining({
          payment: expect.any(Types.ObjectId),
          invoiceNumber: 'INV-2024-001',
          status: InvoiceStatus.PAID, // ← fix
          invoiceDate: expect.any(Date),
        }),
      });
      expect(result).toEqual(mockInvoice);
    });

    it('should throw error when invoice creation fails', async () => {
      const createDto = {
        paymentId: mockPaymentId.toString(),
      };

      invoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      invoiceRepo.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createInvoiceFromPayment(createDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

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
      expect(result.invoiceNumber).toBe('INV-2024-001');
      expect(result.payment).toBeDefined();
      expect(result.cart).toBeDefined();
      expect(result.customer).toBeDefined();
      expect(result.customer.name).toBe('John Doe');
      expect(result.customer.defaultShippingAddress).toBeDefined();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(mockInvoice._id.toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

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

  describe('updateStatus', () => {
    it('should update invoice status to refunded', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.REFUNDED, // ← fix
        refundedAt: new Date(),
      };

      invoiceRepo.findById.mockResolvedValue(mockInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      const result = await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.REFUNDED, // ← fix
      );

      expect(invoiceRepo.findById).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
      });
      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: expect.objectContaining({
          status: InvoiceStatus.REFUNDED, // ← fix
          refundedAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe(InvoiceStatus.REFUNDED); // ← fix
    });

    it('should update invoice status to cancelled', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED, // ← fix
      };

      invoiceRepo.findById.mockResolvedValue(mockInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      const result = await service.updateStatus(
        mockInvoice._id.toString(),
        InvoiceStatus.CANCELLED, // ← fix
      );

      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: { status: InvoiceStatus.CANCELLED }, // ← fix
      });
      expect(result.status).toBe(InvoiceStatus.CANCELLED); // ← fix
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          mockInvoice._id.toString(),
          InvoiceStatus.REFUNDED,
        ), // ← fix
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCustomer', () => {
    it('should return customer invoices', async () => {
      const invoices = [mockPopulatedInvoice];
      invoiceRepo.findAll.mockResolvedValue(invoices as any);

      const result = await service.findByCustomer(mockUserId.toString());

      expect(invoiceRepo.findAll).toHaveBeenCalledWith({
        filter: {
          deleted_at: { $exists: false },
        },
        options: expect.objectContaining({
          sort: { invoiceDate: -1 },
          populate: expect.any(Array),
        }),
      });
      expect(result.length).toBe(1);
      expect(result[0].customer.name).toBe('John Doe');
    });

    it('should filter out invoices from other customers', async () => {
      const otherUserId = new Types.ObjectId();
      const invoices = [
        mockPopulatedInvoice,
        {
          ...mockPopulatedInvoice,
          payment: {
            ...mockPopulatedInvoice.payment,
            userId: {
              _id: otherUserId,
              name: 'Jane Doe',
              email: 'jane@example.com',
            },
          },
        },
      ];
      invoiceRepo.findAll.mockResolvedValue(invoices as any);

      const result = await service.findByCustomer(mockUserId.toString());

      expect(result.length).toBe(1);
      expect(result[0].customer.name).toBe('John Doe');
    });
  });

  describe('remove', () => {
    it('should soft delete invoice', async () => {
      invoiceRepo.findById.mockResolvedValue(mockInvoice as any);
      invoiceRepo.update.mockResolvedValue({
        ...mockInvoice,
        deleted_at: new Date(),
      } as any);

      await service.remove(mockInvoice._id.toString());

      expect(invoiceRepo.findById).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
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
  });
});
