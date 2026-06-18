import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Promotion, PromotionDocument } from './schemas/promotion.schema';
import { PromotionScope, PromotionStatus, PromotionType } from './enums';

@Injectable()
export class PromotionRepository extends BaseRepository<PromotionDocument> {
  constructor(@InjectModel(Promotion.name) model: Model<PromotionDocument>) {
    super(model);
  }

  async findByQuery(filter: {
    status?: PromotionStatus;
    featured?: boolean;
    type?: PromotionType;
    teamId?: string;
  }): Promise<PromotionDocument[]> {
    const query: FilterQuery<PromotionDocument> = {};

    if (filter.status) query.status = filter.status;
    if (filter.featured !== undefined) query.featured = filter.featured;
    if (filter.type) query.type = filter.type;
    if (filter.teamId) query.teamId = new Types.ObjectId(filter.teamId);

    return this.model.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find ACTIVE promotions whose date range is valid and that cover at least
   * one of the given product IDs (or have scope ALL / CATEGORIES).
   */
  async findApplicableForProducts(
    productIds: Types.ObjectId[],
    categoryIds: Types.ObjectId[],
    now: Date = new Date(),
  ): Promise<PromotionDocument[]> {
    return this.model
      .find({
        status: PromotionStatus.ACTIVE,
        $or: [{ startDate: null }, { startDate: { $lte: now } }],
        $and: [
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
          {
            $or: [
              { applicableScope: PromotionScope.ALL },
              {
                applicableScope: PromotionScope.PRODUCTS,
                productIds: { $in: productIds },
              },
              {
                applicableScope: PromotionScope.CATEGORIES,
                categoryIds: { $in: categoryIds },
              },
            ],
          },
        ],
      })
      .sort({ discountValue: -1 })
      .exec();
  }

  async incrementUsageCount(id: Types.ObjectId): Promise<PromotionDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true },
    ).exec();
  }
}
