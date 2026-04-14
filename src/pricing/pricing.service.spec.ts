import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PricingService, DEFAULT_CURRENCY } from './pricing.service';
import { PricingRuleRepository } from './pricing-rule.repository';
import { PromoCodeRepository } from './promo-code.repository';
import { CurrencyService } from '../currency/currency.service';
import { PricingRuleType } from './schemas/pricing-rule.schema';
import { DiscountType } from './schemas/promo-code.schema';

// ── Shared helpers ─────────────────────────────────────────────────────────

const userId = new Types.ObjectId().toString();
const teamId = new Types.ObjectId().toString();

const pastDate = new Date(Date.now() - 86400_000 * 2);
const futureDate = new Date(Date.now() + 86400_000 * 30);

function buildPromo(overrides: Partial<any> = {}): any {
  return {
    _id: new Types.ObjectId(),
    code: 'PROMO10',
    description: 'Test promo',
    teamId: null,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderAmountEur: null,
    maxUses: null,
    usedCount: 0,
    validFrom: pastDate,
    validUntil: futureDate,
    isActive: true,
    createdBy: new Types.ObjectId(),
    deleted_at: null,
    ...overrides,
  };
}

function buildRule(overrides: Partial<any> = {}): any {
  return {
    _id: new Types.ObjectId(),
    teamId: null,
    name: 'Delivery fee',
    type: PricingRuleType.DELIVERY,
    basePriceEur: 2,
    isActive: true,
    validFrom: null,
    validUntil: null,
    createdBy: new Types.ObjectId(),
    deleted_at: null,
    ...overrides,
  };
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe('PricingService', () => {
  let service: PricingService;
  let pricingRuleRepo: {
    create: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findActiveForTeam: jest.Mock;
  };
  let promoCodeRepo: {
    create: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findByCode: jest.Mock;
    incrementUsedCount: jest.Mock;
  };
  let currencyService: { getEurRate: jest.Mock; convert: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PricingRuleRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            delete: jest.fn(),
            findActiveForTeam: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: PromoCodeRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            delete: jest.fn(),
            findByCode: jest.fn().mockResolvedValue(null),
            incrementUsedCount: jest.fn(),
          },
        },
        {
          provide: CurrencyService,
          useValue: {
            getEurRate: jest.fn().mockResolvedValue(4800),
            convert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    pricingRuleRepo = module.get(PricingRuleRepository);
    promoCodeRepo = module.get(PromoCodeRepository);
    currencyService = module.get(CurrencyService);
  });

  // ── createRule ────────────────────────────────────────────────────────────

  describe('createRule', () => {
    it('creates a pricing rule', async () => {
      const rule = buildRule();
      pricingRuleRepo.create.mockResolvedValue(rule);

      const dto = {
        name: 'Delivery fee',
        type: PricingRuleType.DELIVERY,
        basePriceEur: 2,
      };
      const result = await service.createRule(dto, userId);
      expect(pricingRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            name: 'Delivery fee',
            basePriceEur: 2,
            type: PricingRuleType.DELIVERY,
          }),
        }),
      );
      expect(result).toEqual(rule);
    });
  });

  // ── updateRule ────────────────────────────────────────────────────────────

  describe('updateRule', () => {
    it('throws NotFoundException if rule not found', async () => {
      pricingRuleRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateRule(new Types.ObjectId().toString(), {
          basePriceEur: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates the rule', async () => {
      const rule = buildRule();
      pricingRuleRepo.findById.mockResolvedValue(rule);
      pricingRuleRepo.update.mockResolvedValue({ ...rule, basePriceEur: 5 });

      const result = await service.updateRule(rule._id.toString(), {
        basePriceEur: 5,
      });
      expect(result.basePriceEur).toBe(5);
    });
  });

  // ── createPromoCode ───────────────────────────────────────────────────────

  describe('createPromoCode', () => {
    const baseDto = {
      code: 'SUMMER20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      validFrom: pastDate.toISOString(),
      validUntil: futureDate.toISOString(),
    };

    it('throws ConflictException if code already exists', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(buildPromo());
      await expect(service.createPromoCode(baseDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws if percentage > 100', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(null);
      await expect(
        service.createPromoCode({ ...baseDto, discountValue: 110 }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if validFrom >= validUntil', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(null);
      await expect(
        service.createPromoCode(
          {
            ...baseDto,
            validFrom: futureDate.toISOString(),
            validUntil: pastDate.toISOString(),
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a promo code', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(null);
      const promo = buildPromo({ code: 'SUMMER20' });
      promoCodeRepo.create.mockResolvedValue(promo);

      const result = await service.createPromoCode(baseDto, userId);
      expect(promoCodeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({ code: 'SUMMER20' }),
        }),
      );
      expect(result).toEqual(promo);
    });
  });

  // ── validatePromoCode ─────────────────────────────────────────────────────

  describe('validatePromoCode', () => {
    it('throws NotFoundException for unknown code', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(null);
      await expect(
        service.validatePromoCode({ code: 'UNKNOWN', orderSubtotalEur: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if promo is inactive', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({ isActive: false }),
      );
      await expect(
        service.validatePromoCode({ code: 'PROMO10', orderSubtotalEur: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if promo is expired', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({ validUntil: pastDate }),
      );
      await expect(
        service.validatePromoCode({ code: 'PROMO10', orderSubtotalEur: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if minimum order not met', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({ minOrderAmountEur: 100 }),
      );
      await expect(
        service.validatePromoCode({ code: 'PROMO10', orderSubtotalEur: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if promo is scoped to a different team', async () => {
      const otherTeam = new Types.ObjectId();
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({ teamId: otherTeam }),
      );
      await expect(
        service.validatePromoCode({
          code: 'PROMO10',
          orderSubtotalEur: 50,
          teamId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the promo for a valid code', async () => {
      const promo = buildPromo();
      promoCodeRepo.findByCode.mockResolvedValue(promo);
      const result = await service.validatePromoCode({
        code: 'PROMO10',
        orderSubtotalEur: 50,
      });
      expect(result).toEqual(promo);
    });
  });

  // ── calculateTotal ────────────────────────────────────────────────────────

  describe('calculateTotal', () => {
    it('returns correct totals with no rules or promo', async () => {
      const summary = await service.calculateTotal({ cartSubtotalEur: 10 });

      expect(summary.subtotalEur).toBe(10);
      expect(summary.surchargesTotalEur).toBe(0);
      expect(summary.discountEur).toBe(0);
      expect(summary.totalEur).toBe(10);
      expect(summary.currency).toBe(DEFAULT_CURRENCY); // MGA
      expect(summary.exchangeRate).toBe(4800);
      expect(summary.totalLocal).toBe(10 * 4800);
    });

    it('applies surcharge lines', async () => {
      pricingRuleRepo.findActiveForTeam.mockResolvedValue([
        buildRule({ basePriceEur: 2, type: PricingRuleType.DELIVERY }),
        buildRule({
          basePriceEur: 1,
          type: PricingRuleType.SERVICE,
          name: 'Service fee',
        }),
      ]);

      const summary = await service.calculateTotal({ cartSubtotalEur: 10 });
      expect(summary.surchargesTotalEur).toBe(3);
      expect(summary.totalEur).toBe(13);
    });

    it('skips DELIVERY rule for pickup orders', async () => {
      pricingRuleRepo.findActiveForTeam.mockResolvedValue([
        buildRule({ basePriceEur: 2, type: PricingRuleType.DELIVERY }),
      ]);

      const summary = await service.calculateTotal({
        cartSubtotalEur: 10,
        deliveryMethod: 'pickup',
      });
      expect(summary.surchargesTotalEur).toBe(0);
      expect(summary.totalEur).toBe(10);
    });

    it('applies percentage promo correctly', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({ discountValue: 10 }),
      );

      const summary = await service.calculateTotal({
        cartSubtotalEur: 100,
        promoCode: 'PROMO10',
      });
      // 10% of 100 = 10 EUR discount
      expect(summary.discountEur).toBe(10);
      expect(summary.totalEur).toBe(90);
    });

    it('applies fixed EUR promo correctly', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({ discountType: DiscountType.FIXED_EUR, discountValue: 5 }),
      );

      const summary = await service.calculateTotal({
        cartSubtotalEur: 50,
        promoCode: 'PROMO10',
      });
      expect(summary.discountEur).toBe(5);
      expect(summary.totalEur).toBe(45);
    });

    it('caps fixed discount at subtotal amount', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({
          discountType: DiscountType.FIXED_EUR,
          discountValue: 200,
        }),
      );

      const summary = await service.calculateTotal({
        cartSubtotalEur: 50,
        promoCode: 'PROMO10',
      });
      // Discount capped at 50
      expect(summary.discountEur).toBe(50);
      expect(summary.totalEur).toBe(0);
    });

    it('gracefully ignores invalid promo during calculation', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(
        buildPromo({ isActive: false }),
      );

      const summary = await service.calculateTotal({
        cartSubtotalEur: 50,
        promoCode: 'EXPIRED',
      });
      expect(summary.discountEur).toBe(0);
      expect(summary.promoCodeSnapshot).toBeNull();
    });

    it('converts total to local currency correctly', async () => {
      currencyService.getEurRate.mockResolvedValue(4800);
      const summary = await service.calculateTotal({
        cartSubtotalEur: 10,
        currency: 'MGA',
      });
      expect(summary.totalLocal).toBe(48000);
    });
  });

  // ── redeemPromoCode ───────────────────────────────────────────────────────

  describe('redeemPromoCode', () => {
    it('throws if promo code not found', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(null);
      await expect(service.redeemPromoCode('NOTEXIST', 50)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws if atomic increment fails (race condition)', async () => {
      promoCodeRepo.findByCode.mockResolvedValue(buildPromo());
      promoCodeRepo.incrementUsedCount.mockResolvedValue(null); // simulates race

      await expect(service.redeemPromoCode('PROMO10', 50)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns updated promo after successful redemption', async () => {
      const promo = buildPromo();
      promoCodeRepo.findByCode.mockResolvedValue(promo);
      promoCodeRepo.incrementUsedCount.mockResolvedValue({
        ...promo,
        usedCount: 1,
      });

      const result = await service.redeemPromoCode('PROMO10', 50);
      expect(result.usedCount).toBe(1);
    });
  });
});
