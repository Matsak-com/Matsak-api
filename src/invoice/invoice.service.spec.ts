import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';

// ── IDs fixes ──────────────────────────────────────────────────────
const mockInvoiceId = new Types.ObjectId('507f1f77bcf86cd799439011');
const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439012');
const mockPaymentId = new Types.ObjectId('507f1f77bcf86cd799439013');
const mockCartId = new Types.ObjectId('507f1f77bcf86cd799439014');

// ── Factories ──────────────────────────────────────────────────────
const makePayment = (userIdOverride?: Types.ObjectId) => ({
  _id: new Types.ObjectId(),
  method: 'MVOLA',
  amount: 15000,
  currency: 'Ar',
  status: 'SUCCESS',
  correlationId: 'corr-001',
  customerPhone: '0340000001',
  transactionReference: 'ref-001',
  serverCorrelationId: 'sc-001',
  mvolaResponse: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: {
    _id: userIdOverride ?? mockUserId,
    name: 'John Doe',
    email: 'john@example.com',
    addresses: [
      { _id: new Types.ObjectId(), isDefault: true, street: '123 Main St' },
    ],
  },
  cartId: {
    _id: mockCartId,
    items: [
      {
        product: { _id: new Types.ObjectId(), name: 'Produit A' },
        quantity: 2,
      },
    ],
  },
});

const makeInvoice = (overrides: any = {}) => ({
  _id: mockInvoiceId,
  invoiceNumber: 'INV-2024-001',
  invoiceDate: new Date('2024-01-15'),
  status: 'paid',
  refundedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  payment: makePayment(),
  userId: mockUserId,
  ...overrides,
});

// ── Mock repo ──────────────────────────────────────────────────────
const makeRepoMock = () => ({
  generateInvoiceNumber: jest.fn().mockResolvedValue('INV-2024-001'),
  create: jest.fn().mockResolvedValue(makeInvoice()),
  findById: jest.fn().mockResolvedValue(makeInvoice()),
  findOne: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([makeInvoice()]),
  update: jest
    .fn()
    .mockImplementation(({ update }) =>
      Promise.resolve({ ...makeInvoice(), ...update }),
    ),
});

// ══════════════════════════════════════════════════════════════════
describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    invoiceRepo = makeRepoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: InvoiceRepository, useValue: invoiceRepo },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createInvoiceFromPayment ──────────────────────────────────────
  describe('createInvoiceFromPayment', () => {
    it('crée une facture avec paymentId et userId', async () => {
      const created = makeInvoice();
      invoiceRepo.create.mockResolvedValue(created);

      const result = await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
        userId: mockUserId.toString(),
      });

      expect(invoiceRepo.generateInvoiceNumber).toHaveBeenCalled();
      expect(invoiceRepo.create).toHaveBeenCalledWith({
        doc: expect.objectContaining({
          payment: expect.any(Types.ObjectId),
          userId: expect.any(Types.ObjectId),
          invoiceNumber: 'INV-2024-001',
          status: 'paid',
        }),
      });
      expect(result).toEqual(created);
    });

    it('crée une facture sans userId quand non fourni', async () => {
      await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
      });

      const call = invoiceRepo.create.mock.calls[0][0];
      expect(call.doc.userId).toBeUndefined();
    });

    it('retourne la facture existante en cas de duplicate key (11000)', async () => {
      const existing = makeInvoice();
      invoiceRepo.create.mockRejectedValue({ code: 11000 });
      invoiceRepo.findOne.mockResolvedValue(existing);

      const result = await service.createInvoiceFromPayment({
        paymentId: mockPaymentId.toString(),
        userId: mockUserId.toString(),
      });

      expect(invoiceRepo.findOne).toHaveBeenCalledWith({
        filter: { payment: expect.any(Types.ObjectId) },
      });
      expect(result).toEqual(existing);
    });

    it("propage l'erreur si 11000 mais facture introuvable (incohérence)", async () => {
      invoiceRepo.create.mockRejectedValue({ code: 11000 });
      invoiceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createInvoiceFromPayment({
          paymentId: mockPaymentId.toString(),
        }),
      ).rejects.toMatchObject({ code: 11000 });
    });

    it('propage les erreurs non-11000', async () => {
      invoiceRepo.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createInvoiceFromPayment({
          paymentId: mockPaymentId.toString(),
        }),
      ).rejects.toThrow('Database error');
    });
  });

  // ── findOne ───────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retourne la facture formatée avec payment, cart et customer', async () => {
      invoiceRepo.findById.mockResolvedValue(makeInvoice());

      const result = await service.findOne(mockInvoiceId.toString());

      expect(result.invoiceNumber).toBe('INV-2024-001');
      expect(result.payment.amount).toBe(15000);
      expect(result.customer.name).toBe('John Doe');
      expect(result.cart.items).toHaveLength(1);
    });

    it('lève NotFoundException si facture introuvable', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('gère le cas customer null (paiement anonyme)', async () => {
      const invoice = makeInvoice();
      invoice.payment.userId = null;
      invoiceRepo.findById.mockResolvedValue(invoice);

      const result = await service.findOne(mockInvoiceId.toString());
      expect(result.customer).toBeNull();
    });

    it('retourne null pour defaultShippingAddress si aucune adresse par défaut', async () => {
      const invoice = makeInvoice();
      invoice.payment.userId.addresses = [
        { _id: new Types.ObjectId(), isDefault: false, street: 'Rue B' },
      ];
      invoiceRepo.findById.mockResolvedValue(invoice);

      const result = await service.findOne(mockInvoiceId.toString());
      expect(result.customer.defaultShippingAddress).toBeNull();
    });
  });

  // ── findByPaymentId ───────────────────────────────────────────────
  describe('findByPaymentId', () => {
    it('retourne la facture correspondant au paymentId', async () => {
      const inv = makeInvoice();
      invoiceRepo.findOne.mockResolvedValue(inv);

      const result = await service.findByPaymentId(mockPaymentId.toString());

      expect(invoiceRepo.findOne).toHaveBeenCalledWith({
        filter: { payment: expect.any(Types.ObjectId) },
      });
      expect(result).toEqual(inv);
    });

    it('retourne null si aucune facture trouvée', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);
      const result = await service.findByPaymentId(mockPaymentId.toString());
      expect(result).toBeNull();
    });
  });

  // ── findByCustomer ────────────────────────────────────────────────
  describe('findByCustomer', () => {
    it('appelle findAll avec le filtre userId et deleted_at en base', async () => {
      invoiceRepo.findAll.mockResolvedValue([makeInvoice()]);

      await service.findByCustomer(mockUserId.toString());

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

      // Vérifie que l'ObjectId correspond bien au customerId
      const callArg = invoiceRepo.findAll.mock.calls[0][0];
      expect(callArg.filter.userId.toString()).toBe(mockUserId.toString());
    });

    it('retourne les factures formatées', async () => {
      invoiceRepo.findAll.mockResolvedValue([makeInvoice()]);

      const result = await service.findByCustomer(mockUserId.toString());

      expect(result).toHaveLength(1);
      expect(result[0].invoiceNumber).toBe('INV-2024-001');
      expect(result[0].customer.name).toBe('John Doe');
    });

    it('retourne un tableau vide si aucune facture', async () => {
      invoiceRepo.findAll.mockResolvedValue([]);

      const result = await service.findByCustomer(mockUserId.toString());
      expect(result).toHaveLength(0);
    });

    it('ne filtre pas en mémoire — le filtre est délégué à la base', async () => {
      // findAll ne retourne que les factures du bon customer (filtre base)
      invoiceRepo.findAll.mockResolvedValue([makeInvoice()]);

      const result = await service.findByCustomer(mockUserId.toString());

      // findAll appelé une seule fois avec le bon filtre
      expect(invoiceRepo.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].customer.name).toBe('John Doe');
    });
  });

  // ── updateStatus ──────────────────────────────────────────────────
  describe('updateStatus', () => {
    it('met à jour le statut vers paid', async () => {
      invoiceRepo.findById.mockResolvedValue(makeInvoice());
      invoiceRepo.update.mockResolvedValue(makeInvoice({ status: 'paid' }));

      const result = await service.updateStatus(
        mockInvoiceId.toString(),
        'paid',
      );

      expect(invoiceRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: 'paid' }),
        }),
      );
      expect(result.status).toBe('paid');
    });

    it("ajoute refundedAt lors d'un remboursement", async () => {
      invoiceRepo.findById.mockResolvedValue(makeInvoice());
      invoiceRepo.update.mockResolvedValue(makeInvoice({ status: 'refunded' }));

      await service.updateStatus(mockInvoiceId.toString(), 'refunded');

      const callArg = invoiceRepo.update.mock.calls[0][0];
      expect(callArg.update.refundedAt).toBeInstanceOf(Date);
    });

    it('ne set pas refundedAt pour les autres statuts', async () => {
      invoiceRepo.findById.mockResolvedValue(makeInvoice());
      invoiceRepo.update.mockResolvedValue(
        makeInvoice({ status: 'cancelled' }),
      );

      await service.updateStatus(mockInvoiceId.toString(), 'cancelled');

      const callArg = invoiceRepo.update.mock.calls[0][0];
      expect(callArg.update.refundedAt).toBeUndefined();
    });

    it('lève NotFoundException si facture introuvable', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', 'paid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ────────────────────────────────────────────────────────
  describe('remove', () => {
    it('soft-delete la facture en ajoutant deleted_at', async () => {
      invoiceRepo.findById.mockResolvedValue(makeInvoice());

      await service.remove(mockInvoiceId.toString());

      expect(invoiceRepo.update).toHaveBeenCalledWith({
        id: mockInvoiceId.toString(),
        update: { deleted_at: expect.any(Date) },
      });
    });

    it('lève NotFoundException si facture introuvable', async () => {
      invoiceRepo.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
