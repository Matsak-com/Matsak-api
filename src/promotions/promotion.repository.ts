import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Promotion, PromotionDocument } from './schemas/promotion.schema';
import { PromotionStatus, PromotionType } from './enums';

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
}
