import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from './ad.repository';
import { PromotionRepository } from './promotion.repository';
import { AdImageService } from './ad-image.service';
import { CreateAdDto, UpdateAdDto, QueryAdDto } from './dto/ad.dto';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  QueryPromotionDto,
} from './dto/promotion.dto';
import { DiscountType, PromotionScope, PromotionStatus } from './enums';

export interface PromotionSnapshot {
  promotionId: string;
  title: string;
  discountType: DiscountType;
  discountValue: number;
  applicableScope: PromotionScope;
}

export interface CartDiscountResult {
  discountEur: number;
  promotionSnapshot: PromotionSnapshot;
}

@Injectable()
export class PromotionsService {
  constructor(
    private readonly adRepository: AdRepository,
    private readonly promotionRepository: PromotionRepository,
    private readonly adImageService: AdImageService,
  ) {}

  // ══════════════════════════════════════════════════════════
  // ADS
  // ══════════════════════════════════════════════════════════

  async findAllAds(query: QueryAdDto) {
    return this.adRepository.findByQuery({
      status: query.status,
      placement: query.placement,
      teamId: query.teamId,
    });
  }

  async createAd(dto: CreateAdDto, imageFile?: Express.Multer.File) {
    let imageUrl: string | null = null;
    let imageFileKey: string | null = null;

    if (imageFile) {
      const uploaded = await this.adImageService.upload(imageFile);
      imageUrl = uploaded.imageUrl;
      imageFileKey = uploaded.imageFileKey;
    }

    return this.adRepository.create({
      doc: {
        title: dto.title,
        description: dto.description ?? null,
        imageUrl,
        imageFileKey,
        targetUrl: dto.targetUrl ?? null,
        placement: dto.placement,
        type: dto.type,
        status: dto.status,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : null,
      },
    });
  }

  async updateAd(
    id: string,
    dto: UpdateAdDto,
    imageFile?: Express.Multer.File,
  ) {
    const update: Record<string, unknown> = {};

    if (imageFile) {
      // Fetch current ad to get old imageFileKey for deletion
      const existing = await this.adRepository.findById({ id });
      if (!existing) {
        throw new NotFoundException('Ad not found');
      }

      const uploaded = await this.adImageService.upload(imageFile);
      update.imageUrl = uploaded.imageUrl;
      update.imageFileKey = uploaded.imageFileKey;

      // Delete old file after successful upload (best-effort)
      await this.adImageService.delete(existing.imageFileKey);
    }

    if (dto.title !== undefined) update.title = dto.title;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.targetUrl !== undefined) update.targetUrl = dto.targetUrl;
    if (dto.placement !== undefined) update.placement = dto.placement;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.priority !== undefined) update.priority = dto.priority;
    if (dto.startDate !== undefined)
      update.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      update.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.teamId !== undefined)
      update.teamId = dto.teamId ? new Types.ObjectId(dto.teamId) : null;

    const updated = await this.adRepository.update({ id, update });

    if (!updated) {
      throw new NotFoundException('Ad not found');
    }

    return updated;
  }

  async deleteAd(id: string): Promise<void> {
    const ad = await this.adRepository.findById({ id });
    if (!ad) {
      throw new NotFoundException('Ad not found');
    }
    // Remove stored image file (best-effort)
    await this.adImageService.delete(ad.imageFileKey);
    await this.adRepository.delete({ id });
  }

  async trackImpression(id: string): Promise<{ impressions: number }> {
    const ad = await this.adRepository.incrementField(id, 'impressions');
    if (!ad) {
      throw new NotFoundException('Ad not found');
    }
    return { impressions: ad.impressions };
  }

  async trackClick(id: string): Promise<{ clicks: number }> {
    const ad = await this.adRepository.incrementField(id, 'clicks');
    if (!ad) {
      throw new NotFoundException('Ad not found');
    }
    return { clicks: ad.clicks };
  }

  // ══════════════════════════════════════════════════════════
  // PROMOTIONS
  // ══════════════════════════════════════════════════════════

  async findAllPromotions(query: QueryPromotionDto) {
    return this.promotionRepository.findByQuery({
      status: query.status,
      featured: query.featured,
      type: query.type,
      teamId: query.teamId,
    });
  }

  async createPromotion(
    dto: CreatePromotionDto,
    imageFile?: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;
    let imageFileKey: string | null = null;

    if (imageFile) {
      const uploaded = await this.adImageService.upload(imageFile);
      imageUrl = uploaded.imageUrl;
      imageFileKey = uploaded.imageFileKey;
    }

    return this.promotionRepository.create({
      doc: {
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        status: dto.status,
        discountValue: dto.discountValue ?? null,
        discountType: dto.discountType ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        imageUrl,
        imageFileKey,
        targetUrl: dto.targetUrl ?? null,
        teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : null,
        featured: dto.featured ?? false,
        applicableScope: dto.applicableScope ?? PromotionScope.ALL,
        productIds: dto.productIds?.map((id) => new Types.ObjectId(id)) ?? [],
        categoryIds: dto.categoryIds?.map((id) => new Types.ObjectId(id)) ?? [],
        minCartAmountEur: dto.minCartAmountEur ?? null,
        maxUsageCount: dto.maxUsageCount ?? null,
        usageCount: 0,
      },
    });
  }

  async updatePromotion(
    id: string,
    dto: UpdatePromotionDto,
    imageFile?: Express.Multer.File,
  ) {
    const update: Record<string, unknown> = {};

    if (imageFile) {
      const existing = await this.promotionRepository.findById({ id });
      if (!existing) {
        throw new NotFoundException('Promotion not found');
      }
      const uploaded = await this.adImageService.upload(imageFile);
      update.imageUrl = uploaded.imageUrl;
      update.imageFileKey = uploaded.imageFileKey;
      await this.adImageService.delete(existing.imageFileKey);
    }

    if (dto.title !== undefined) update.title = dto.title;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.discountValue !== undefined)
      update.discountValue = dto.discountValue;
    if (dto.discountType !== undefined) update.discountType = dto.discountType;
    if (dto.startDate !== undefined)
      update.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      update.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.targetUrl !== undefined) update.targetUrl = dto.targetUrl;
    if (dto.teamId !== undefined)
      update.teamId = dto.teamId ? new Types.ObjectId(dto.teamId) : null;
    if (dto.featured !== undefined) update.featured = dto.featured;
    if (dto.applicableScope !== undefined)
      update.applicableScope = dto.applicableScope;
    if (dto.productIds !== undefined)
      update.productIds = dto.productIds.map((id) => new Types.ObjectId(id));
    if (dto.categoryIds !== undefined)
      update.categoryIds = dto.categoryIds.map((id) => new Types.ObjectId(id));
    if (dto.minCartAmountEur !== undefined)
      update.minCartAmountEur = dto.minCartAmountEur;
    if (dto.maxUsageCount !== undefined)
      update.maxUsageCount = dto.maxUsageCount;

    const updated = await this.promotionRepository.update({ id, update });

    if (!updated) {
      throw new NotFoundException('Promotion not found');
    }

    return updated;
  }

  async deletePromotion(id: string): Promise<void> {
    const promotion = await this.promotionRepository.findById({ id });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }
    await this.adImageService.delete(promotion.imageFileKey);
    await this.promotionRepository.delete({ id });
  }

  // ══════════════════════════════════════════════════════════
  // PRODUCT / CATEGORY ASSOCIATIONS
  // ══════════════════════════════════════════════════════════

  async setPromotionProducts(id: string, productIds: string[]) {
    const promotion = await this.promotionRepository.findById({ id });
    if (!promotion) throw new NotFoundException('Promotion not found');

    const updated = await this.promotionRepository.update({
      id,
      update: {
        applicableScope: PromotionScope.PRODUCTS,
        productIds: productIds.map((pid) => new Types.ObjectId(pid)),
      },
    });
    return updated;
  }

  async setPromotionCategories(id: string, categoryIds: string[]) {
    const promotion = await this.promotionRepository.findById({ id });
    if (!promotion) throw new NotFoundException('Promotion not found');

    const updated = await this.promotionRepository.update({
      id,
      update: {
        applicableScope: PromotionScope.CATEGORIES,
        categoryIds: categoryIds.map((cid) => new Types.ObjectId(cid)),
      },
    });
    return updated;
  }

  async clearPromotionScope(id: string) {
    const promotion = await this.promotionRepository.findById({ id });
    if (!promotion) throw new NotFoundException('Promotion not found');

    return this.promotionRepository.update({
      id,
      update: {
        applicableScope: PromotionScope.ALL,
        productIds: [],
        categoryIds: [],
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // APPLICABLE PROMOTIONS QUERY
  // ══════════════════════════════════════════════════════════

  async findApplicableForProducts(
    productIds: string[],
    categoryIds: string[] = [],
  ) {
    return this.promotionRepository.findApplicableForProducts(
      productIds.map((id) => new Types.ObjectId(id)),
      categoryIds.map((id) => new Types.ObjectId(id)),
    );
  }

  // ══════════════════════════════════════════════════════════
  // DISCOUNT COMPUTATION
  // ══════════════════════════════════════════════════════════

  /**
   * Compute the EUR discount for a promotion applied to a cart.
   *
   * For scope=ALL: discount is applied on the full subtotal.
   * For scope=PRODUCTS: discount is applied only on eligible product subtotals.
   * For scope=CATEGORIES: same as PRODUCTS but matched via categoryIds.
   *
   * Returns null if the promotion is not applicable (inactive, expired, usage
   * exceeded, or minimum cart amount not met).
   */
  async computeCartDiscount(params: {
    promotionId: string;
    cartItems: Array<{
      productId: string;
      categoryIds?: string[];
      priceEur: number;
      quantity: number;
    }>;
    subtotalEur: number;
  }): Promise<CartDiscountResult | null> {
    const { promotionId, cartItems, subtotalEur } = params;

    const promotion = await this.promotionRepository.findById({
      id: promotionId,
    });

    if (!promotion) throw new NotFoundException('Promotion not found');

    const now = new Date();

    if (promotion.status !== PromotionStatus.ACTIVE) return null;
    if (promotion.startDate && promotion.startDate > now) return null;
    if (promotion.endDate && promotion.endDate < now) return null;
    if (
      promotion.maxUsageCount !== null &&
      promotion.usageCount >= promotion.maxUsageCount
    )
      return null;
    if (
      promotion.minCartAmountEur !== null &&
      subtotalEur < promotion.minCartAmountEur
    )
      return null;

    if (!promotion.discountValue || !promotion.discountType) return null;

    let eligibleSubtotal = subtotalEur;

    if (promotion.applicableScope === PromotionScope.PRODUCTS) {
      const eligibleIds = new Set(
        promotion.productIds.map((id) => id.toString()),
      );
      eligibleSubtotal = cartItems
        .filter((item) => eligibleIds.has(item.productId))
        .reduce((sum, item) => sum + item.priceEur * item.quantity, 0);
    } else if (promotion.applicableScope === PromotionScope.CATEGORIES) {
      const eligibleCatIds = new Set(
        promotion.categoryIds.map((id) => id.toString()),
      );
      eligibleSubtotal = cartItems
        .filter((item) =>
          item.categoryIds?.some((cid) => eligibleCatIds.has(cid)),
        )
        .reduce((sum, item) => sum + item.priceEur * item.quantity, 0);
    }

    if (eligibleSubtotal <= 0) return null;

    let discountEur: number;
    if (promotion.discountType === DiscountType.PERCENTAGE) {
      discountEur =
        Math.round(eligibleSubtotal * (promotion.discountValue / 100) * 100) /
        100;
    } else {
      discountEur = Math.min(promotion.discountValue, eligibleSubtotal);
    }

    return {
      discountEur,
      promotionSnapshot: {
        promotionId: (promotion._id as Types.ObjectId).toString(),
        title: promotion.title,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        applicableScope: promotion.applicableScope,
      },
    };
  }

  /** Atomically increment usage count — call after successful payment. */
  async redeemPromotion(promotionId: string): Promise<void> {
    await this.promotionRepository.incrementUsageCount(
      new Types.ObjectId(promotionId),
    );
  }
}
