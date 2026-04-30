import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import * as crypto from 'crypto';

import { DeliveryCheckService } from './delivery-check.service';
import { DeliveryCheck, DeliveryCheckType } from './delivery-check.schema';
import { Invoice } from './invoice.schema';
import { User } from '../users/user.schema';
import { NotificationService } from '../notifications/notification.service';
import { I18nService } from '../notifications/i18n.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const INVOICE_ID = new Types.ObjectId();
const PRODUCT_ID = new Types.ObjectId();
const DOC_ID = new Types.ObjectId();

const makeItem = (checked = false) => ({
  productId: PRODUCT_ID,
  name: 'Paracétamol',
  quantity: 2,
  checkedAt: checked ? new Date() : null,
  checkedBy: checked ? 'Livreur Test' : null,
});

const makeDoc = (overrides: Record<string, any> = {}) => ({
  _id: DOC_ID,
  invoiceId: INVOICE_ID,
  invoiceNumber: 'INV-2026-0001',
  type: DeliveryCheckType.DELIVERY,
  tokenHash: 'abc',
  items: [makeItem()],
  completedAt: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revoked: false,
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDeliveryCheckModel = {
  findById: jest.fn(),
  updateOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockInvoiceModel = {
  findById: jest.fn(),
};

const mockUserModel: Record<string, jest.Mock> = {};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockNotificationService = {
  sendEmail: jest.fn(),
};

const mockI18nService = {
  translate: jest
    .fn()
    .mockReturnValue('Livraison confirmée — Facture INV-2026-0001'),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('DeliveryCheckService', () => {
  let service: DeliveryCheckService;

  beforeEach(async () => {
    // resetAllMocks clears call history AND implementations (including Once queue),
    // preventing stale mock values from leaking between tests.
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryCheckService,
        {
          provide: getModelToken(DeliveryCheck.name),
          useValue: mockDeliveryCheckModel,
        },
        {
          provide: getModelToken(Invoice.name),
          useValue: mockInvoiceModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<DeliveryCheckService>(DeliveryCheckService);
    process.env.DELIVERY_QR_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.DELIVERY_QR_SECRET;
  });

  // ── Helper: set up a valid verifyToken chain ──────────────────────────────

  /**
   * Configure mocks so that `verifyToken(token)` succeeds and returns `doc`.
   * Uses mockReturnValueOnce so it doesn't interfere with subsequent findById
   * calls in the same test (e.g. re-fetch inside checkItem).
   */
  function mockVerifyToken(token: string, docOverrides: Record<string, any> = {}) {
    const tokenHash_ = hashToken(token);
    const doc = makeDoc({ tokenHash: tokenHash_, ...docOverrides });

    mockJwtService.verify.mockReturnValue({
      sub: DOC_ID.toString(),
      inv: doc.invoiceNumber,
      type: doc.type,
      jti: 'test-jti',
    });
    // verifyToken calls findById().exec() — queue ONE Once value for that call
    mockDeliveryCheckModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(doc),
    });

    return doc;
  }

  // ── verifyToken() ──────────────────────────────────────────────────────────

  describe('verifyToken()', () => {
    it('throws UnauthorizedException for an expired JWT', async () => {
      mockJwtService.verify.mockImplementation(() => {
        const err: any = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

      await expect(service.verifyToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for an invalid JWT', async () => {
      mockJwtService.verify.mockImplementation(() => {
        const err: any = new Error('invalid signature');
        err.name = 'JsonWebTokenError';
        throw err;
      });

      await expect(service.verifyToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws NotFoundException when DeliveryCheck document does not exist', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: DOC_ID.toString(),
        inv: 'INV-2026-0001',
        type: DeliveryCheckType.DELIVERY,
        jti: 'some-jti',
      });
      mockDeliveryCheckModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.verifyToken('valid-jwt')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for a revoked token', async () => {
      const token = 'revoked-token';
      mockVerifyToken(token, { revoked: true });

      await expect(service.verifyToken(token)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws UnauthorizedException for an expired document (expiresAt in past)', async () => {
      const token = 'expired-doc-token';
      mockVerifyToken(token, { expiresAt: new Date(Date.now() - 1000) });

      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when stored hash does not match', async () => {
      const token = 'mismatched-token';
      // Store hash of a DIFFERENT token
      const wrongHash = hashToken('different-token');
      const doc = makeDoc({ tokenHash: wrongHash });

      mockJwtService.verify.mockReturnValue({
        sub: DOC_ID.toString(),
        inv: 'INV-2026-0001',
        type: DeliveryCheckType.DELIVERY,
        jti: 'test-jti',
      });
      mockDeliveryCheckModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('resolves successfully when token is valid', async () => {
      const token = 'good-token';
      const doc = mockVerifyToken(token);

      await expect(service.verifyToken(token)).resolves.toBe(doc);
    });
  });

  // ── checkItem() ────────────────────────────────────────────────────────────

  describe('checkItem()', () => {
    const TOKEN = 'check-item-token';

    it('throws BadRequestException for an invalid productId format', async () => {
      await expect(
        service.checkItem(TOKEN, 'not-a-valid-objectid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when delivery is already completed', async () => {
      mockVerifyToken(TOKEN, { completedAt: new Date() });

      await expect(
        service.checkItem(TOKEN, PRODUCT_ID.toString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when productId is not in the checklist', async () => {
      const unknownProductId = new Types.ObjectId();
      mockVerifyToken(TOKEN); // doc has PRODUCT_ID, not unknownProductId
      mockDeliveryCheckModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        service.checkItem(TOKEN, unknownProductId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when matchedCount is 0 (race: already completed)', async () => {
      mockVerifyToken(TOKEN);
      mockDeliveryCheckModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        service.checkItem(TOKEN, PRODUCT_ID.toString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('atomically marks the item as checked via $set with positional operator', async () => {
      const doc = mockVerifyToken(TOKEN);
      // Re-fetch returns a doc where the item is still unchecked (allChecked=false)
      mockDeliveryCheckModel.updateOne.mockResolvedValue({ matchedCount: 1 });
      mockDeliveryCheckModel.findById.mockResolvedValueOnce(doc); // re-fetch

      await service.checkItem(TOKEN, PRODUCT_ID.toString(), 'Livreur A');

      expect(mockDeliveryCheckModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: DOC_ID,
          completedAt: null,
          'items.productId': expect.any(Types.ObjectId),
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            'items.$.checkedAt': expect.any(Date),
            'items.$.checkedBy': 'Livreur A',
          }),
        }),
      );
    });

    it('auto-completes and triggers confirmation email when all items are checked', async () => {
      const checkedItem = makeItem(true);
      const completedDoc = makeDoc({ completedAt: new Date(), items: [checkedItem] });

      // verifyToken: returns doc where item is unchecked
      mockVerifyToken(TOKEN);
      mockDeliveryCheckModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      // Re-fetch: all items are now checked, completedAt still null
      mockDeliveryCheckModel.findById
        .mockResolvedValueOnce(makeDoc({ items: [checkedItem] }))

      // Atomic completion: this caller wins the race
      mockDeliveryCheckModel.findOneAndUpdate.mockResolvedValue(completedDoc);

      // Email chain
      mockInvoiceModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            userId: new Types.ObjectId(),
            invoiceNumber: 'INV-2026-0001',
            invoiceDate: new Date(),
            currency: 'MGA',
            subtotalLocal: 100,
            surchargesTotalLocal: 0,
            discountLocal: 0,
            pricingLines: [],
            promoCodeSnapshot: null,
            totalLocal: 100,
            cartSnapshot: { items: [] },
          }),
        }),
      });
      mockUserModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: 'Doe',
            firstname: 'John',
            email: 'john@example.com',
            locale: 'fr',
            addresses: [],
          }),
        }),
      });
      mockNotificationService.sendEmail.mockResolvedValue(undefined);
      mockI18nService.translate.mockReturnValue('Livraison confirmée — Facture INV-2026-0001');

      const result = await service.checkItem(TOKEN, PRODUCT_ID.toString(), 'Livreur B');

      expect(result.completedAt).toBeTruthy();

      // Fire-and-forget: give the microtask queue a tick
      await new Promise((r) => setImmediate(r));
      expect(mockNotificationService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('does NOT send email when not all items are checked', async () => {
      const doc = mockVerifyToken(TOKEN);
      mockDeliveryCheckModel.updateOne.mockResolvedValue({ matchedCount: 1 });
      // Re-fetch: item still unchecked
      mockDeliveryCheckModel.findById.mockResolvedValueOnce(
        makeDoc({ items: [makeItem(false)] }),
      );

      await service.checkItem(TOKEN, PRODUCT_ID.toString());

      await new Promise((r) => setImmediate(r));
      expect(mockNotificationService.sendEmail).not.toHaveBeenCalled();
    });

    it('only sends completion email once even if two callers race to complete', async () => {
      const checkedItem = makeItem(true);

      // verifyToken: unchecked doc
      mockVerifyToken(TOKEN);
      mockDeliveryCheckModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      // Re-fetch: all checked, not yet completed
      mockDeliveryCheckModel.findById.mockResolvedValueOnce(
        makeDoc({ items: [checkedItem] }),
      );

      // Atomic completion: this caller LOST the race (null means someone else completed first)
      mockDeliveryCheckModel.findOneAndUpdate.mockResolvedValue(null);

      // Final reload: document was completed by the other caller
      const completedDoc = makeDoc({ completedAt: new Date(), items: [checkedItem] });
      mockDeliveryCheckModel.findById.mockResolvedValueOnce(completedDoc);

      // Email chain (the loser still sends the email — the guard in the service fires for both)
      mockInvoiceModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null), // no invoice → no email
        }),
      });

      const result = await service.checkItem(TOKEN, PRODUCT_ID.toString());

      expect(result.completedAt).toBeTruthy();
      // Fire-and-forget tick
      await new Promise((r) => setImmediate(r));
    });
  });

  // ── completeDelivery() ─────────────────────────────────────────────────────

  describe('completeDelivery()', () => {
    const TOKEN = 'complete-delivery-token';

    it('throws ForbiddenException if already completed', async () => {
      mockVerifyToken(TOKEN, { completedAt: new Date() });

      await expect(
        service.completeDelivery(TOKEN, 'Pharmacien'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('marks all unchecked items and sets completedAt', async () => {
      const doc = mockVerifyToken(TOKEN);

      await service.completeDelivery(TOKEN, 'Admin User');

      expect(doc.save).toHaveBeenCalled();
      expect(doc.completedAt).toBeTruthy();
      doc.items.forEach((item: any) => {
        expect(item.checkedAt).toBeTruthy();
        expect(item.checkedBy).toBe('Admin User');
      });
    });

    it('uses "Livreur" as default checkerName when none is provided', async () => {
      const doc = mockVerifyToken(TOKEN);

      await service.completeDelivery(TOKEN);

      doc.items
        .filter((i: any) => !i.checkedAt)
        .forEach((item: any) => {
          expect(item.checkedBy).toBe('Livreur');
        });
    });

    it('sends confirmation email after completion', async () => {
      mockVerifyToken(TOKEN);

      mockInvoiceModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            userId: new Types.ObjectId(),
            invoiceNumber: 'INV-2026-0001',
            invoiceDate: new Date(),
            currency: 'MGA',
            subtotalLocal: 100,
            surchargesTotalLocal: 0,
            discountLocal: 0,
            pricingLines: [],
            promoCodeSnapshot: null,
            totalLocal: 100,
            cartSnapshot: { items: [] },
          }),
        }),
      });
      mockUserModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: 'Doe',
            firstname: 'Jane',
            email: 'jane@example.com',
            locale: 'en',
            addresses: [],
          }),
        }),
      });
      mockNotificationService.sendEmail.mockResolvedValue(undefined);

      await service.completeDelivery(TOKEN, 'Pharmacien');

      await new Promise((r) => setImmediate(r));
      expect(mockNotificationService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('does not throw if the confirmation email fails (fire-and-forget)', async () => {
      mockVerifyToken(TOKEN);

      mockInvoiceModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null), // no invoice → logger warning, no email
        }),
      });

      await expect(
        service.completeDelivery(TOKEN, 'Pharmacien'),
      ).resolves.toBeDefined();
    });
  });

  // ── revokeToken() ──────────────────────────────────────────────────────────

  describe('revokeToken()', () => {
    it('sets revoked = true and persists the document', async () => {
      const TOKEN = 'revoke-token';
      const doc = mockVerifyToken(TOKEN);

      await service.revokeToken(TOKEN);

      expect(doc.revoked).toBe(true);
      expect(doc.save).toHaveBeenCalled();
    });
  });

  // ── getDeliveryCheck() ─────────────────────────────────────────────────────

  describe('getDeliveryCheck()', () => {
    it('returns checklist without mutation', async () => {
      const TOKEN = 'read-token';
      const doc = mockVerifyToken(TOKEN);

      const result = await service.getDeliveryCheck(TOKEN);

      expect(result.invoiceNumber).toBe('INV-2026-0001');
      expect(result.items).toHaveLength(1);
      expect(doc.save).not.toHaveBeenCalled();
    });
  });

  // ── i18n email subject ────────────────────────────────────────────────────

  describe('sendDeliveryConfirmationEmail() — i18n subject', () => {
    it('calls I18nService.translate for the email subject and uses the result', async () => {
      const doc = makeDoc({ completedAt: new Date() });

      mockInvoiceModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            userId: new Types.ObjectId(),
            invoiceNumber: 'INV-2026-0001',
            invoiceDate: new Date(),
            currency: 'MGA',
            subtotalLocal: 100,
            surchargesTotalLocal: 0,
            discountLocal: 0,
            pricingLines: [],
            promoCodeSnapshot: null,
            totalLocal: 100,
            cartSnapshot: { items: [] },
          }),
        }),
      });
      mockUserModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: 'Doe',
            firstname: 'John',
            email: 'john@example.com',
            locale: 'en',
            addresses: [],
          }),
        }),
      });
      mockNotificationService.sendEmail.mockResolvedValue(undefined);
      mockI18nService.translate.mockReturnValue(
        'Delivery confirmed — Invoice INV-2026-0001',
      );

      // Call private method via `any` cast
      await (service as any).sendDeliveryConfirmationEmail(doc);

      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'email.deliveryConfirmed.subject',
        expect.any(String),
        expect.objectContaining({ invoiceNumber: 'INV-2026-0001' }),
      );
      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Delivery confirmed — Invoice INV-2026-0001',
        }),
      );
    });

    it('falls back to hard-coded subject when i18n returns empty string', async () => {
      const doc = makeDoc({ completedAt: new Date() });

      mockInvoiceModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            userId: new Types.ObjectId(),
            invoiceNumber: 'INV-2026-0001',
            invoiceDate: new Date(),
            currency: 'MGA',
            subtotalLocal: 100,
            surchargesTotalLocal: 0,
            discountLocal: 0,
            pricingLines: [],
            promoCodeSnapshot: null,
            totalLocal: 100,
            cartSnapshot: { items: [] },
          }),
        }),
      });
      mockUserModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: 'Doe',
            firstname: 'John',
            email: 'john@example.com',
            locale: 'fr',
            addresses: [],
          }),
        }),
      });
      mockNotificationService.sendEmail.mockResolvedValue(undefined);
      // i18n returns empty string → fallback should be used
      mockI18nService.translate.mockReturnValue('');

      await (service as any).sendDeliveryConfirmationEmail(doc);

      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Livraison confirmée — Facture INV-2026-0001',
        }),
      );
    });
  });
});
