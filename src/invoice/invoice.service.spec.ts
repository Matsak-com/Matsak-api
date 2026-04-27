import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { NotificationService } from '../notifications/notification.service';
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
      basePriceEur: 5,
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

const mockNotificationService = {
  sendEmail: jest.fn(),
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
        { provide: InvoiceRepository, useValue: mockInvoiceRepo },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: getModelToken(Payment.name), useValue: MockPaymentModel },
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('Member'), useValue: mockMemberModel },
        { provide: getModelToken('Role'), useValue: mockRoleModel },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    jest.clearAllMocks();

    // Défaut : payment trouvé avec pricingSnapshot
    mockPaymentFindById.mockReturnValue({ populate: mockPaymentPopulate });
    mockPaymentLean.mockResolvedValue(mockPaymentDoc);

    mockInvoiceRepo.generateInvoiceNumber.mockResolvedValue('INV-2026-0001');
    mockInvoiceRepo.create.mockResolvedValue(mockInvoice);
    mockInvoiceRepo.findById.mockResolvedValue(mockInvoice);
    mockInvoiceRepo.findOne.mockResolvedValue(null);
    mockNotificationService.sendEmail.mockResolvedValue(undefined);
  });

  // ── createInvoiceFromPayment() ───────────────────────────────────────────────

  describe('createInvoiceFromPayment()', () => {
    it('copie le pricingSnapshot sans recalculer le pricing', async () => {
      await service.createInvoiceFromPayment({
        paymentId: PAYMENT_ID.toString(),
      });

      const doc = mockInvoiceRepo.create.mock.calls[0][0].doc;
      expect(doc.currency).toBe(mockPricingSnapshot.currency);
      expect(doc.exchangeRate).toBe(mockPricingSnapshot.exchangeRate);
      expect(doc.subtotalEur).toBe(mockPricingSnapshot.subtotalEur);
      expect(doc.subtotalLocal).toBe(mockPricingSnapshot.subtotalLocal);
      expect(doc.surchargesTotalEur).toBe(
        mockPricingSnapshot.surchargesTotalEur,
      );
      expect(doc.surchargesTotalLocal).toBe(
        mockPricingSnapshot.surchargesTotalLocal,
      );
      expect(doc.discountEur).toBe(mockPricingSnapshot.discountEur);
      expect(doc.discountLocal).toBe(mockPricingSnapshot.discountLocal);
      expect(doc.totalEur).toBe(mockPricingSnapshot.totalEur);
      expect(doc.totalLocal).toBe(mockPricingSnapshot.totalLocal);
      expect(doc.promoCodeSnapshot).toBeNull();
    });

    it("totalLocal de l'invoice === amount du payment (invariant principal)", async () => {
      await service.createInvoiceFromPayment({
        paymentId: PAYMENT_ID.toString(),
      });

      const doc = mockInvoiceRepo.create.mock.calls[0][0].doc;
      expect(doc.totalLocal).toBe(mockPaymentDoc.amount);
    });

    it('construit le cartSnapshot correctement', async () => {
      await service.createInvoiceFromPayment({
        paymentId: PAYMENT_ID.toString(),
      });

      const doc = mockInvoiceRepo.create.mock.calls[0][0].doc;
      expect(doc.cartSnapshot.cartId.toString()).toBe(CART_ID.toString());
      expect(doc.cartSnapshot.items).toHaveLength(1);
      expect(doc.cartSnapshot.items[0].quantity).toBe(1);
      expect(doc.cartSnapshot.items[0].price).toBe(480000);
      expect(doc.cartSnapshot.items[0].product.name).toBe('Paracétamol 500mg');
      expect(doc.cartSnapshot.snapshotAt).toBeInstanceOf(Date);
    });

    it('copie le promoCodeSnapshot si présent', async () => {
      const promoSnapshot = {
        code: 'PROMO10',
        discountType: 'percentage',
        discountValue: 10,
      };
      mockPaymentLean.mockResolvedValue({
        ...mockPaymentDoc,
        pricingSnapshot: {
          ...mockPricingSnapshot,
          promoCodeSnapshot: promoSnapshot,
          discountEur: 10,
          discountLocal: 48000,
          totalLocal: 456000,
        },
      });

      await service.createInvoiceFromPayment({
        paymentId: PAYMENT_ID.toString(),
      });

      const doc = mockInvoiceRepo.create.mock.calls[0][0].doc;
      expect(doc.promoCodeSnapshot).toEqual(promoSnapshot);
      expect(doc.discountLocal).toBe(48000);
      expect(doc.totalLocal).toBe(456000);
    });

    it('copie les pricingLines dans le cartSnapshot', async () => {
      await service.createInvoiceFromPayment({
        paymentId: PAYMENT_ID.toString(),
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
        service.createInvoiceFromPayment({ paymentId: PAYMENT_ID.toString() }),
      ).rejects.toThrow(/pricingSnapshot/);
    });

    it('lève NotFoundException si payment introuvable', async () => {
      mockPaymentLean.mockResolvedValue(null);

      await expect(
        service.createInvoiceFromPayment({ paymentId: PAYMENT_ID.toString() }),
      ).rejects.toThrow(NotFoundException);
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

      const doc = mockInvoiceRepo.create.mock.calls[0][0].doc;
      expect(doc.status).toBe(InvoiceStatus.PAID);
    });

    it('loggue PRICING_MISMATCH sans throw si amount !== totalLocal', async () => {
      const loggerSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => {});

      mockPaymentLean.mockResolvedValue({
        ...mockPaymentDoc,
        amount: 999999, // ← diverge volontairement du pricingSnapshot.totalLocal (504000)
      });

      await service.createInvoiceFromPayment({
        paymentId: PAYMENT_ID.toString(),
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('PRICING_MISMATCH'),
      );
      // La facture est quand même créée
      expect(mockInvoiceRepo.create).toHaveBeenCalled();
    });
  });

  // ── updateStatus() ───────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    beforeEach(() => {
      mockInvoiceRepo.findById.mockResolvedValue(mockInvoice);
      mockInvoiceRepo.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.REFUNDED,
        refundedAt: new Date(),
      });
    });

    it('ajoute refundedAt si nouveau statut est REFUNDED', async () => {
      await service.updateStatus(INVOICE_ID.toString(), InvoiceStatus.REFUNDED);

      expect(mockInvoiceRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: InvoiceStatus.REFUNDED,
            refundedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('ne ajoute pas refundedAt si statut est CANCELLED', async () => {
      mockInvoiceRepo.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.CANCELLED,
      });
      await service.updateStatus(
        INVOICE_ID.toString(),
        InvoiceStatus.CANCELLED,
      );

      const updateCall = mockInvoiceRepo.update.mock.calls[0][0].update;
      expect(updateCall.refundedAt).toBeUndefined();
    });

    it('lève NotFoundException si facture introuvable', async () => {
      mockInvoiceRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateStatus(INVOICE_ID.toString(), InvoiceStatus.CANCELLED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne la facture formatée', async () => {
      mockInvoiceRepo.findById.mockResolvedValue(mockInvoice);
      const result = await service.findOne(INVOICE_ID.toString());
      expect(result._id).toEqual(INVOICE_ID);
      expect(result.invoiceNumber).toBe('INV-2026-0001');
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

      await service.remove(INVOICE_ID.toString());

      expect(mockInvoiceRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            deleted_at: expect.any(Date),
          }),
        }),
      );
    });

    it('lève NotFoundException si facture introuvable', async () => {
      mockInvoiceRepo.findById.mockResolvedValue(null);
      await expect(service.remove('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findByPaymentId() ─────────────────────────────────────────────────────────

  describe('findByPaymentId()', () => {
    it('retourne null si aucune facture pour ce paiement', async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);
      const result = await service.findByPaymentId(PAYMENT_ID.toString());
      expect(result).toBeNull();
    });

    it('retourne la facture si elle existe', async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(mockInvoice);
      const result = await service.findByPaymentId(PAYMENT_ID.toString());
      expect(result.invoiceNumber).toBe('INV-2026-0001');
    });
  });
});
