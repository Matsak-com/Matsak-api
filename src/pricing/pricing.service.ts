import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrencyService } from '../currency/currency.service';
import { PricingRuleRepository } from './pricing-rule.repository';
import { PromoCodeRepository } from './promo-code.repository';
import { PricingRuleType } from './schemas/pricing-rule.schema';
import { DiscountType, PromoCodeDocument } from './schemas/promo-code.schema';
import {
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
} from './dto/pricing-rule.dto';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  ValidatePromoCodeDto,
} from './dto/promo-code.dto';

export const DEFAULT_CURRENCY = 'MGA';

export interface PricingLine {
  type: PricingRuleType;
  name: string;
  basePriceEur: number;
  /** Price in the target local currency */
  localPrice: number;
}

export interface PricingSummary {
  currency: string;
  /** Exchange rate: 1 EUR = X currency */
  exchangeRate: number;
  exchangeRateSnapshotAt: Date;

  /** Cart items subtotal in EUR (passed from outside) */
  subtotalEur: number;
  /** Cart items subtotal in local currency */
  subtotalLocal: number;

  /** Applied surcharge lines (delivery, service, high demand) */
  pricingLines: PricingLine[];
  /** Sum of all surcharges in EUR */
  surchargesTotalEur: number;
  /** Sum of all surcharges in local currency */
  surchargesTotalLocal: number;

  /** Discount amount in EUR */
  discountEur: number;
  /** Discount amount in local currency */
  discountLocal: number;

  promoCodeSnapshot: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
  } | null;

  /** (subtotal + surcharges − discount) in EUR */
  totalEur: number;
  /** Total in local currency */
  totalLocal: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly pricingRuleRepo: PricingRuleRepository,
    private readonly promoCodeRepo: PromoCodeRepository,
    private readonly currencyService: CurrencyService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // PRICING RULES
  // ═══════════════════════════════════════════════════════════

  async createRule(dto: CreatePricingRuleDto, createdBy: string) {
    return this.pricingRuleRepo.create({
      doc: {
        teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : null,
        name: dto.name,
        type: dto.type,
        basePriceEur: dto.basePriceEur,
        isActive: dto.isActive ?? true,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        createdBy: new Types.ObjectId(createdBy),
      },
    });
  }

  async updateRule(id: string, dto: UpdatePricingRuleDto) {
    const rule = await this.pricingRuleRepo.findById({ id });
    if (!rule) throw new NotFoundException(`Pricing rule ${id} not found`);

    const update: Record<string, any> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.basePriceEur !== undefined) update.basePriceEur = dto.basePriceEur;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.validFrom !== undefined)
      update.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined)
      update.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;

    return this.pricingRuleRepo.update({ id, update });
  }

  async deleteRule(id: string) {
    const rule = await this.pricingRuleRepo.findById({ id });
    if (!rule) throw new NotFoundException(`Pricing rule ${id} not found`);
    return this.pricingRuleRepo.delete({ id });
  }

  async listRules(teamId?: string) {
    return this.pricingRuleRepo.findAll({
      filter: teamId
        ? {
            $or: [
              { teamId: new Types.ObjectId(teamId) },
              { teamId: null },
            ],
          }
        : {},
      options: { sort: { type: 1, createdAt: -1 } },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PROMO CODES
  // ═══════════════════════════════════════════════════════════

  async createPromoCode(dto: CreatePromoCodeDto, createdBy: string) {
    const existing = await this.promoCodeRepo.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(
        `Promo code "${dto.code.toUpperCase()}" already exists`,
      );
    }

    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    if (new Date(dto.validFrom) >= new Date(dto.validUntil)) {
      throw new BadRequestException('validFrom must be before validUntil');
    }

    return this.promoCodeRepo.create({
      doc: {
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
        teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderAmountEur: dto.minOrderAmountEur ?? null,
        maxUses: dto.maxUses ?? null,
        usedCount: 0,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        isActive: dto.isActive ?? true,
        createdBy: new Types.ObjectId(createdBy),
      },
    });
  }

  async updatePromoCode(id: string, dto: UpdatePromoCodeDto) {
    const code = await this.promoCodeRepo.findById({ id });
    if (!code) throw new NotFoundException(`Promo code ${id} not found`);

    const update: Record<string, any> = {};
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.discountType !== undefined) update.discountType = dto.discountType;
    if (dto.discountValue !== undefined) update.discountValue = dto.discountValue;
    if (dto.minOrderAmountEur !== undefined)
      update.minOrderAmountEur = dto.minOrderAmountEur;
    if (dto.maxUses !== undefined) update.maxUses = dto.maxUses;
    if (dto.validFrom !== undefined)
      update.validFrom = new Date(dto.validFrom);
    if (dto.validUntil !== undefined)
      update.validUntil = new Date(dto.validUntil);
    if (dto.isActive !== undefined) update.isActive = dto.isActive;

    return this.promoCodeRepo.update({ id, update });
  }

  async deletePromoCode(id: string) {
    const code = await this.promoCodeRepo.findById({ id });
    if (!code) throw new NotFoundException(`Promo code ${id} not found`);
    return this.promoCodeRepo.delete({ id });
  }

  async listPromoCodes(teamId?: string) {
    return this.promoCodeRepo.findAll({
      filter: teamId
        ? {
            $or: [
              { teamId: new Types.ObjectId(teamId) },
              { teamId: null },
            ],
          }
        : {},
      options: { sort: { createdAt: -1 }, populate: { path: 'teamId' } },
    });
  }

  /**
   * Validate a promo code without redeeming it.
   * Returns the promo or throws with a descriptive error.
   */
  async validatePromoCode(dto: ValidatePromoCodeDto): Promise<PromoCodeDocument> {
    const promo = await this.promoCodeRepo.findByCode(dto.code);
    if (!promo) throw new NotFoundException(`Promo code not found`);

    this.assertPromoUsable(promo, dto.orderSubtotalEur, dto.teamId);
    return promo;
  }

  /**
   * Redeem a promo code — atomically increments usedCount.
   * Returns the promo snapshot to embed in the invoice.
   */
  async redeemPromoCode(
    code: string,
    orderSubtotalEur: number,
    teamId?: string,
  ): Promise<PromoCodeDocument> {
    const promo = await this.promoCodeRepo.findByCode(code);
    if (!promo) throw new NotFoundException(`Promo code not found`);

    this.assertPromoUsable(promo, orderSubtotalEur, teamId);

    const updated = await this.promoCodeRepo.incrementUsedCount(promo._id as Types.ObjectId);
    if (!updated) {
      throw new BadRequestException(
        'Promo code is no longer valid or has reached its usage limit',
      );
    }
    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // TOTAL CALCULATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Calculate the full pricing summary for an order.
   *
   * @param cartSubtotalEur  Products subtotal already in EUR
   * @param teamId           Team used to look up team-specific rules
   * @param promoCode        Optional promo code string
   * @param currency         Target display currency (default = MGA)
   * @param deliveryMethod   'delivery' | 'pickup' — pickup skips DELIVERY surcharge
   */
  async calculateTotal(params: {
    cartSubtotalEur: number;
    teamId?: string | null;
    promoCode?: string | null;
    currency?: string;
    deliveryMethod?: 'delivery' | 'pickup';
  }): Promise<PricingSummary> {
    const {
      cartSubtotalEur,
      teamId = null,
      promoCode = null,
      currency = DEFAULT_CURRENCY,
      deliveryMethod = 'delivery',
    } = params;

    const [exchangeRate, activeRules] = await Promise.all([
      this.currencyService.getEurRate(currency),
      this.pricingRuleRepo.findActiveForTeam(teamId),
    ]);
    const snapshotAt = new Date();

    // Build pricing lines (skip DELIVERY for pickup)
    const pricingLines: PricingLine[] = [];
    for (const rule of activeRules) {
      if (
        rule.type === PricingRuleType.DELIVERY &&
        deliveryMethod === 'pickup'
      ) {
        continue;
      }
      pricingLines.push({
        type: rule.type,
        name: rule.name,
        basePriceEur: rule.basePriceEur,
        localPrice: Math.round(rule.basePriceEur * exchangeRate * 100) / 100,
      });
    }

    const surchargesTotalEur = pricingLines.reduce(
      (acc, l) => acc + l.basePriceEur,
      0,
    );
    const surchargesTotalLocal =
      Math.round(surchargesTotalEur * exchangeRate * 100) / 100;

    // Calculate discount
    let discountEur = 0;
    let promoSnapshot: PricingSummary['promoCodeSnapshot'] = null;

    if (promoCode) {
      try {
        const promo = await this.promoCodeRepo.findByCode(promoCode);
        if (promo) {
          this.assertPromoUsable(promo, cartSubtotalEur, teamId ?? undefined);

          if (promo.discountType === DiscountType.PERCENTAGE) {
            discountEur =
              Math.round(cartSubtotalEur * (promo.discountValue / 100) * 100) /
              100;
          } else {
            discountEur = Math.min(promo.discountValue, cartSubtotalEur);
          }

          promoSnapshot = {
            code: promo.code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
          };
        }
      } catch {
        // Invalid promo is silently ignored at calculation stage;
        // actual redemption (`redeemPromoCode`) will throw properly.
        this.logger.warn(`Promo code "${promoCode}" skipped during calculation`);
      }
    }

    const discountLocal = Math.round(discountEur * exchangeRate * 100) / 100;
    const subtotalLocal = Math.round(cartSubtotalEur * exchangeRate * 100) / 100;

    const totalEur =
      Math.round(
        (cartSubtotalEur + surchargesTotalEur - discountEur) * 100,
      ) / 100;
    const totalLocal = Math.round(totalEur * exchangeRate * 100) / 100;

    return {
      currency,
      exchangeRate,
      exchangeRateSnapshotAt: snapshotAt,
      subtotalEur: cartSubtotalEur,
      subtotalLocal,
      pricingLines,
      surchargesTotalEur,
      surchargesTotalLocal,
      discountEur,
      discountLocal,
      promoCodeSnapshot: promoSnapshot,
      totalEur,
      totalLocal,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertPromoUsable(
    promo: PromoCodeDocument,
    orderSubtotalEur: number,
    teamId?: string | null,
  ): void {
    const now = new Date();

    if (!promo.isActive) {
      throw new BadRequestException('Promo code is inactive');
    }
    if (promo.validFrom > now) {
      throw new BadRequestException('Promo code is not yet valid');
    }
    if (promo.validUntil < now) {
      throw new BadRequestException('Promo code has expired');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }
    if (
      promo.minOrderAmountEur !== null &&
      orderSubtotalEur < promo.minOrderAmountEur
    ) {
      throw new BadRequestException(
        `Minimum order amount of €${promo.minOrderAmountEur} required`,
      );
    }
    // Team scope check: promo with a teamId is only valid for that team
    if (promo.teamId !== null) {
      const promoTeamId = promo.teamId.toString();
      const orderTeamId = teamId?.toString();
      if (promoTeamId !== orderTeamId) {
        throw new BadRequestException(
          'Promo code is not valid for this team',
        );
      }
    }
  }
}
