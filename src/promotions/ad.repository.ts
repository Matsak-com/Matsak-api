import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Ad, AdDocument } from './schemas/ad.schema';
import { AdPlacement, AdStatus } from './enums';

@Injectable()
export class AdRepository extends BaseRepository<AdDocument> {
  constructor(@InjectModel(Ad.name) model: Model<AdDocument>) {
    super(model);
  }

  async findByQuery(filter: {
    status?: AdStatus;
    placement?: AdPlacement;
    teamId?: string;
  }): Promise<AdDocument[]> {
    const query: FilterQuery<AdDocument> = {};

    if (filter.status) query.status = filter.status;
    if (filter.placement) query.placement = filter.placement;
    if (filter.teamId) query.teamId = new Types.ObjectId(filter.teamId);

    return this.model.find(query).sort({ priority: 1, createdAt: -1 }).exec();
  }

  async incrementField(
    id: string,
    field: 'impressions' | 'clicks',
  ): Promise<AdDocument | null> {
    return this.model
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $inc: { [field]: 1 } },
        { new: true },
      )
      .exec();
  }
}
