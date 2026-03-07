import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { PaymentStatus, PaymentMethod } from './payment.schema';
import { MvolaApiService } from './Mvola/mvola-api.service';
import { CartRepository } from '../cart-item/cart.repository';
import { ProductService } from '../product/product.service';
import { InvoiceService } from '../invoice/invoice.service';
import { CartService } from '../cart-item/cart.service';
import { InventoryService } from '../inventory/inventory.service';

// ── IDs fixes ──────────────────────────────────────────────────────
const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439012');
const mockPaymentId = new Types.ObjectId('507f1f77bcf86cd799439013');
const mockProductId = new Types.ObjectId('507f1f77bcf86cd799439014');
const mockCartId = new Types.ObjectId('507f1f77bcf86cd799439015');

// ── Factories ──────────────────────────────────────────────────────
const makeProduct = (overrides: any = {}) => ({
  _id: mockProductId,
  name: 'Produit Test',
  trackStock: true,
  ...overrides,
});

const makeCart = (overrides: any = {}) => ({
  _id: mockCartId,
  deleted_at: null,
  items: [{ product: makeProduct(), quantity: 2 }],
  ...overrides,
});

const makePayment = (overrides: any = {}) => ({
  _id: mockPaymentId,
  cartId: mockCartId,
  userId: mockUserId,
  method: PaymentMethod.MVOLA,
  amount: 7500,
  currency: 'Ar',
  status: PaymentStatus.WAITING,
  correlationId: 'corr-001',
  serverCorrelationId: 'sc-001',
  transactionReference: 'ref-001',
  customerPhone: '0340000001',
  ...overrides,
});

const defaultPriceMock = () => ({ totalPrice: 7500, unitPrice: 3750 });

// ══════════════════════════════════════════════════════════════════
describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepo: jest.Mocked<any>;
  let cartRepo: jest.Mocked<any>;
  let cartService: jest.Mocked<any>;
  let productService: jest.Mocked<any>;
  let mvolaApiService: jest.Mocked<any>;
  let invoiceService: jest.Mocked<any>;
  let inventoryService: jest.Mocked<any>;

  beforeEach(async () => {
    paymentRepo = {
      create: jest.fn().mockResolvedValue(makePayment()),
      findById: jest.fn().mockResolvedValue(makePayment()),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(makePayment()),
    };

    cartRepo = {
      findById: jest.fn().mockResolvedValue(makeCart()),
    };

    cartService = {
      softDeleteCartById: jest.fn().mockResolvedValue(undefined),
    };

    productService = {
      calculatePrice: jest.fn().mockReturnValue(defaultPriceMock()),
    };

    mvolaApiService = {
      initMerchantPay: jest.fn().mockResolvedValue({
        serverCorrelationId: 'sc-001',
        status: 'pending',
      }),
      getTransactionStatus: jest.fn().mockResolvedValue({
        status: 'PENDING',
        serverCorrelationId: 'sc-001',
      }),
    };

    invoiceService = {
      createInvoiceFromPayment: jest
        .fn()
        .mockResolvedValue({ invoiceNumber: 'INV-001' }),
      findByPaymentId: jest.fn().mockResolvedValue(null),
    };

    inventoryService = {
      stockOut: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentRepository, useValue: paymentRepo },
        { provide: CartRepository, useValue: cartRepo },
        { provide: CartService, useValue: cartService },
        { provide: ProductService, useValue: productService },
        { provide: MvolaApiService, useValue: mvolaApiService },
        { provide: InvoiceService, useValue: invoiceService },
        { provide: InventoryService, useValue: inventoryService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── initiate ──────────────────────────────────────────────────────
  describe('initiate', () => {
    const initiateInput = {
      cartId: mockCartId.toString(),
      userId: mockUserId.toString(),
      customerPhone: '0340000001',
    };

    it('crée un paiement et retourne le payment WAITING', async () => {
      const waiting = makePayment({ status: PaymentStatus.WAITING });
      paymentRepo.findById.mockResolvedValue(waiting);

      const result = await service.initiate(initiateInput);

      // Le service convertit cartId et userId en Types.ObjectId
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            cartId: expect.any(Types.ObjectId),
            userId: expect.any(Types.ObjectId),
            amount: 7500,
            status: PaymentStatus.PENDING,
            method: PaymentMethod.MVOLA,
            currency: 'Ar',
            customerPhone: '0340000001',
          }),
        }),
      );

      // Vérification des valeurs des ObjectIds
      const { doc } = paymentRepo.create.mock.calls[0][0];
      expect(doc.cartId.toString()).toBe(mockCartId.toString());
      expect(doc.userId.toString()).toBe(mockUserId.toString());

      expect(mvolaApiService.initMerchantPay).toHaveBeenCalled();
      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            serverCorrelationId: 'sc-001',
            status: PaymentStatus.WAITING,
          }),
        }),
      );
      expect(result.status).toBe(PaymentStatus.WAITING);
    });

    it('lève NotFoundException si le panier est introuvable', async () => {
      cartRepo.findById.mockResolvedValue(null);

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève NotFoundException si le panier est soft-deleted', async () => {
      cartRepo.findById.mockResolvedValue(makeCart({ deleted_at: new Date() }));

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève BadRequestException si le panier est vide', async () => {
      cartRepo.findById.mockResolvedValue(makeCart({ items: [] }));

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève BadRequestException si le montant est nul', async () => {
      productService.calculatePrice.mockReturnValue({ totalPrice: 0 });

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève BadRequestException si un paiement actif existe déjà', async () => {
      paymentRepo.findOne.mockResolvedValue(
        makePayment({ status: PaymentStatus.PENDING }),
      );

      await expect(service.initiate(initiateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marque le paiement FAILED si initMerchantPay lève une erreur', async () => {
      mvolaApiService.initMerchantPay.mockRejectedValue(new Error('API error'));

      await expect(service.initiate(initiateInput)).rejects.toThrow('API error');

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: PaymentStatus.FAILED,
            failureReason: 'API error',
          }),
        }),
      );
    });

    it('fonctionne sans userId (paiement anonyme)', async () => {
      const anonymousInput = {
        cartId: mockCartId.toString(),
        customerPhone: '0340000001',
      };

      await service.initiate(anonymousInput);

      const { doc } = paymentRepo.create.mock.calls[0][0];
      expect(doc.userId).toBeUndefined();
    });

    it('calcule le montant total en sommant tous les items', async () => {
      cartRepo.findById.mockResolvedValue(
        makeCart({
          items: [
            { product: makeProduct(), quantity: 1 },
            { product: makeProduct({ _id: new Types.ObjectId() }), quantity: 3 },
          ],
        }),
      );
      productService.calculatePrice
        .mockReturnValueOnce({ totalPrice: 5000 })
        .mockReturnValueOnce({ totalPrice: 3000 });

      await service.initiate(initiateInput);

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({ amount: 8000 }),
        }),
      );
    });

    it('appelle initMerchantPay avec le bon callbackUrl', async () => {
      await service.initiate(initiateInput);

      expect(mvolaApiService.initMerchantPay).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackUrl: 'http://localhost:3000/payments/callback',
          amount: 7500,
          customerPhone: '0340000001',
        }),
      );
    });
  });

  // ── handleCallback ────────────────────────────────────────────────
  describe('handleCallback', () => {
    const successCallback = {
      serverCorrelationId: 'sc-001',
      status: 'COMPLETED',
      transactionReference: 'ref-001',
    };

    it('met à jour le statut en SUCCESS et déclenche le post-traitement', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());

      await service.handleCallback(successCallback);

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
        }),
      );
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalled();
    });

    it('met à jour le statut en FAILED pour un status non-COMPLETED', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());

      await service.handleCallback({
        serverCorrelationId: 'sc-001',
        status: 'FAILED',
      });

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: PaymentStatus.FAILED,
            failureReason: 'FAILED',
          }),
        }),
      );
      expect(invoiceService.createInvoiceFromPayment).not.toHaveBeenCalled();
    });

    it('ignore le callback sans serverCorrelationId', async () => {
      await service.handleCallback({ status: 'COMPLETED' });

      expect(paymentRepo.findOne).not.toHaveBeenCalled();
      expect(paymentRepo.update).not.toHaveBeenCalled();
    });

    it('ignore le callback pour un serverCorrelationId inconnu', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await service.handleCallback(successCallback);

      expect(paymentRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── pollStatus ────────────────────────────────────────────────────
  describe('pollStatus', () => {
    it('retourne le paiement sans appeler MVola si déjà SUCCESS', async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.SUCCESS }),
      );

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(mvolaApiService.getTransactionStatus).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('retourne le paiement sans appeler MVola si déjà FAILED', async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.FAILED }),
      );

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(mvolaApiService.getTransactionStatus).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.FAILED);
    });

    it('retourne le paiement sans appeler MVola si déjà EXPIRED', async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.EXPIRED }),
      );

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(mvolaApiService.getTransactionStatus).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.EXPIRED);
    });

    it('passe le paiement en SUCCESS quand MVola retourne COMPLETED', async () => {
      paymentRepo.findById
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.WAITING }))
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.SUCCESS }));
      mvolaApiService.getTransactionStatus.mockResolvedValue({
        status: 'COMPLETED',
        serverCorrelationId: 'sc-001',
      });

      const result = await service.pollStatus(mockPaymentId.toString());

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
        }),
      );
      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('passe le paiement en FAILED quand MVola retourne FAILED', async () => {
      paymentRepo.findById
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.WAITING }))
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.FAILED }));
      mvolaApiService.getTransactionStatus.mockResolvedValue({
        status: 'FAILED',
      });

      await service.pollStatus(mockPaymentId.toString());

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: PaymentStatus.FAILED,
            failureReason: 'FAILED',
          }),
        }),
      );
    });

    it("ne met pas à jour si le statut MVola n'a pas changé", async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.WAITING }),
      );
      mvolaApiService.getTransactionStatus.mockResolvedValue({
        status: 'PENDING',
      });

      await service.pollStatus(mockPaymentId.toString());

      expect(paymentRepo.update).not.toHaveBeenCalled();
    });

    it('lève NotFoundException si paiement introuvable', async () => {
      paymentRepo.findById.mockResolvedValue(null);

      await expect(service.pollStatus('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève BadRequestException si données MVola incomplètes', async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({
          status: PaymentStatus.WAITING,
          serverCorrelationId: null,
        }),
      );

      await expect(
        service.pollStatus(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── expire ────────────────────────────────────────────────────────
  describe('expire', () => {
    it('expire un paiement PENDING', async () => {
      paymentRepo.findById
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.PENDING }))
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.EXPIRED }));

      const result = await service.expire(mockPaymentId.toString());

      expect(paymentRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { status: PaymentStatus.EXPIRED },
        }),
      );
      expect(result.status).toBe(PaymentStatus.EXPIRED);
    });

    it('expire un paiement WAITING', async () => {
      paymentRepo.findById
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.WAITING }))
        .mockResolvedValueOnce(makePayment({ status: PaymentStatus.EXPIRED }));

      await service.expire(mockPaymentId.toString());

      expect(paymentRepo.update).toHaveBeenCalled();
    });

    it('lève BadRequestException si le paiement est déjà SUCCESS', async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.SUCCESS }),
      );

      await expect(service.expire(mockPaymentId.toString())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève NotFoundException si paiement introuvable', async () => {
      paymentRepo.findById.mockResolvedValue(null);

      await expect(service.expire('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── regenerateInvoice ─────────────────────────────────────────────
  describe('regenerateInvoice', () => {
    it('régénère la facture avec paymentId ET userId', async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.SUCCESS }),
      );
      invoiceService.findByPaymentId.mockResolvedValue(null);

      await service.regenerateInvoice(mockPaymentId.toString());

      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith({
        paymentId: mockPaymentId.toString(),
        userId: mockUserId.toString(),
      });
    });

    it('lève BadRequestException si une facture existe déjà', async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.SUCCESS }),
      );
      invoiceService.findByPaymentId.mockResolvedValue({
        invoiceNumber: 'INV-001',
      });

      await expect(
        service.regenerateInvoice(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève BadRequestException si le paiement n'est pas SUCCESS", async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.FAILED }),
      );

      await expect(
        service.regenerateInvoice(mockPaymentId.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si paiement introuvable', async () => {
      paymentRepo.findById.mockResolvedValue(null);

      await expect(service.regenerateInvoice('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("passe userId undefined si le paiement n'a pas de userId", async () => {
      paymentRepo.findById.mockResolvedValue(
        makePayment({ status: PaymentStatus.SUCCESS, userId: undefined }),
      );
      invoiceService.findByPaymentId.mockResolvedValue(null);

      await service.regenerateInvoice(mockPaymentId.toString());

      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith({
        paymentId: mockPaymentId.toString(),
        userId: undefined,
      });
    });
  });

  // ── handlePaymentSuccess (via handleCallback) ─────────────────────
  describe('handlePaymentSuccess (ordre facture → stock → panier)', () => {
    const successCallback = {
      serverCorrelationId: 'sc-001',
      status: 'COMPLETED',
    };

    it('exécute facture → stock → panier dans le bon ordre', async () => {
      const callOrder: string[] = [];
      paymentRepo.findOne.mockResolvedValue(makePayment());
      invoiceService.createInvoiceFromPayment.mockImplementation(async () => {
        callOrder.push('invoice');
      });
      inventoryService.stockOut.mockImplementation(async () => {
        callOrder.push('stock');
      });
      cartService.softDeleteCartById.mockImplementation(async () => {
        callOrder.push('cart');
      });

      await service.handleCallback(successCallback);

      expect(callOrder).toEqual(['invoice', 'stock', 'cart']);
    });

    it('crée la facture avec paymentId et userId', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());

      await service.handleCallback(successCallback);

      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalledWith({
        paymentId: mockPaymentId.toString(),
        userId: mockUserId.toString(),
      });
    });

    it('déduit le stock pour les produits trackStock:true', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());

      await service.handleCallback(successCallback);

      expect(inventoryService.stockOut).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: mockProductId.toString(),
          quantity: 2,
          reference: `CART-${mockCartId}`,
        }),
        mockUserId.toString(),
      );
    });

    it('ne déduit pas le stock pour les produits trackStock:false', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());
      cartRepo.findById.mockResolvedValue(
        makeCart({
          items: [{ product: makeProduct({ trackStock: false }), quantity: 1 }],
        }),
      );

      await service.handleCallback(successCallback);

      expect(inventoryService.stockOut).not.toHaveBeenCalled();
    });

    it('soft-delete le panier après succès complet', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());

      await service.handleCallback(successCallback);

      expect(cartService.softDeleteCartById).toHaveBeenCalledWith(mockCartId);
    });
  });

  // ── deductStockFromCart — gestion d'erreur ────────────────────────
  describe('deductStockFromCart (via handleCallback)', () => {
    const successCallback = {
      serverCorrelationId: 'sc-001',
      status: 'COMPLETED',
    };

    it('arrête le traitement si la déduction de stock échoue', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());
      inventoryService.stockOut.mockRejectedValue(
        new Error('Insufficient stock'),
      );

      await expect(
        service.handleCallback(successCallback),
      ).resolves.not.toThrow();

      expect(invoiceService.createInvoiceFromPayment).toHaveBeenCalled();
      expect(cartService.softDeleteCartById).not.toHaveBeenCalled();
    });

    it('continue si le panier est vide (pas de déduction)', async () => {
      paymentRepo.findOne.mockResolvedValue(makePayment());
      cartRepo.findById.mockResolvedValue(makeCart({ items: [] }));

      await service.handleCallback(successCallback);

      expect(inventoryService.stockOut).not.toHaveBeenCalled();
      expect(cartService.softDeleteCartById).toHaveBeenCalled();
    });
  });
});