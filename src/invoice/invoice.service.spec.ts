import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { NotificationService } from '../notifications/notification.service';
import { DeliveryCheckService } from './delivery-check.service';
import { Payment, DeliveryMethod } from '../payment/payment.schema';
import { Invoice, InvoiceStatus } from './invoice.schema';

// ══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ══════════════════════════════════════════════════════════════════════════════

const CART_ID = new Types.ObjectId();
const USER_ID = new Types.ObjectId();
const PAYMENT_ID = new Types.ObjectId();
const INVOICE_ID = new Types.ObjectId();
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

const mockPaymentDoc = {
  _id: PAYMENT_ID,
  cartId: mockCart,
  userId: USER_ID,
  method: 'MVOLA',
  amount: 504000,
  currency: 'Ar',
  status: 'SUCCESS',
  deliveryMethod: DeliveryMethod.DELIVERY,
  deliveryAddressId: ADDRESS_ID,
  correlationId: 'corr-123',
  serverCorrelationId: 'server-corr-123',
  transactionReference: 'txn-123',
  customerPhone: '0340000000',
  pricingSnapshot: mockPricingSnapshot,
};

const mockInvoice: Partial<Invoice> & { _id: Types.ObjectId } = {
  _id: INVOICE_ID,
  payment: PAYMENT_ID,
  invoiceNumber: 'INV-2026-0001',
  invoiceDate: new Date(),
  status: InvoiceStatus.PAID,
  deliveryMethod: DeliveryMethod.DELIVERY,
  cartSnapshot: {
    cartId: CART_ID,
    items: [
      {
        product: {
          _id: PRODUCT_ID,
          name: 'Paracétamol 500mg',
          team: { _id: TEAM_ID, name: 'Pharmacie Test' },
        },
        quantity: 1,
        price: 480000,
      },
    ],
    snapshotAt: new Date(),
  },
  ...mockPricingSnapshot,
} as any;

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

const mockInvoiceRepo = {
  generateInvoiceNumber: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
};
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoiceStatus } from './invoice.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Payment } from '../payment/payment.schema';
import { Cart } from '../cart-item/cart-item.schema';
import { PricingService } from '../pricing/pricing.service';
import { User } from '../users/user.schema';
import { Member } from '../members/member.schema';
import { Role } from '../roles/role.schema';
import { HistoryService } from '../history/history.service';
import { HistoryAction, HistoryEntityType } from '../history/history.schema';

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

const mockDeliveryCheckService = {
  createDeliveryToken: jest.fn().mockResolvedValue('mock-token'),
};

// Modèle Payment : chaîning findById().populate().lean()
const mockPaymentLean = jest.fn();
const mockPaymentPopulate = jest
  .fn()
  .mockReturnValue({ lean: mockPaymentLean });
const mockPaymentFindById = jest
  .fn()
  .mockReturnValue({ populate: mockPaymentPopulate });
const MockPaymentModel = { findById: mockPaymentFindById };

const mockUserModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  }),
};

const mockMemberModel = {
  find: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  }),
};

const mockRoleModel = {
  findOne: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
  }),
};

// ══════════════════════════════════════════════════════════════════════════════
// SUITE
// ══════════════════════════════════════════════════════════════════════════════

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(async () => {
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
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
        {
          provide: getModelToken(User.name),
          useValue: { findById: jest.fn() },
        },
        {
          provide: getModelToken(Member.name),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getModelToken(Role.name),
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceRepo = module.get(InvoiceRepository);
    notificationService = module.get(NotificationService);
  });

  // ── createInvoiceFromPayment() ───────────────────────────────────────────────

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

      const doc = mockInvoiceRepo.create.mock.calls[0][0].doc;
      expect(doc.pricingLines).toHaveLength(1);
      expect(doc.pricingLines[0].name).toBe('Frais de livraison');
      expect(doc.pricingLines[0].localPrice).toBe(24000);
    });

    it('lève une erreur explicite si pricingSnapshot absent (document legacy)', async () => {
      mockPaymentLean.mockResolvedValue({
        ...mockPaymentDoc,
        pricingSnapshot: undefined,
      });

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

    it("ne bloque pas la création si l'envoi d'email échoue (fire-and-forget)", async () => {
      mockNotificationService.sendEmail.mockRejectedValue(
        new Error('SMTP down'),
      );

      await expect(
        service.createInvoiceFromPayment({ paymentId: PAYMENT_ID.toString() }),
      ).resolves.toBeDefined();
    });

    it('positionne le statut à PAID', async () => {
      await service.createInvoiceFromPayment({
        paymentId: PAYMENT_ID.toString(),
      });

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

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('PRICING_MISMATCH'),
      );
      // La facture est quand même créée
      expect(mockInvoiceRepo.create).toHaveBeenCalled();
    });
  });

  // ── updateStatus() ───────────────────────────────────────────────────────────

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
        mockCurrentUserId,
      );

      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoice._id.toString(),
        update: { status: InvoiceStatus.CANCELLED },
      });
      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should not set updatedBy when no currentUserId is provided', async () => {
      const updatedInvoice = { ...mockInvoice, status: InvoiceStatus.CANCELLED };

      invoiceRepo.findById
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue(mockPopulatedInvoice as any);
      invoiceRepo.update.mockResolvedValue(updatedInvoice as any);

      await service.updateStatus(mockInvoice._id.toString(), InvoiceStatus.CANCELLED);

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
          changedFields: ['status'],
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

    it('lève NotFoundException si facture introuvable', async () => {
      mockInvoiceRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateStatus(
          mockInvoice._id.toString(),
          InvoiceStatus.REFUNDED,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────────

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

    it('lève NotFoundException si facture introuvable', async () => {
      mockInvoiceRepo.findById.mockResolvedValue(null);
      await expect(service.findOne('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove() ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('soft-delete la facture (deleted_at)', async () => {
      mockInvoiceRepo.findById.mockResolvedValue({
        ...mockInvoice,
        customer: { name: 'Client Test', email: 'client@test.com' },
        payment: { ...mockPaymentDoc, amount: 504000, currency: 'Ar' },
        totalLocal: 504000,
        currency: 'MGA',
      });

      await service.remove(mockInvoice._id.toString());

      // L'email est fire-and-forget, on attend la résolution des promises pendantes
      await Promise.resolve();

      expect(mockInvoiceRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            deleted_at: expect.any(Date),
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
      // Facture dont aucun item n'appartient à mockTeamId (cas incohérent en prod,
      // mais le service doit le gérer proprement)
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