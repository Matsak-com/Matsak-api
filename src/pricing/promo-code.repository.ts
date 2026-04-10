import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import {
  PromoCode,
  PromoCodeDocument,
} from './schemas/promo-code.schema';

@Injectable()
export class PromoCodeRepository extends BaseRepository<PromoCodeDocument> {
  constructor(
    @InjectModel(PromoCode.name)
    model: Model<PromoCodeDocument>,
  ) {
    super(model);
  }

  async findByCode(code: string): Promise<PromoCodeDocument | null> {
    return this.findOne({
      filter: { code: code.toUpperCase() },
      options: { populate: { path: 'teamId' } },
    });
  }

  /**
   * Atomically increment `usedCount` only if the code can still be used.
   * Returns the updated document or null if the condition failed (race-safe).
   */
  async incrementUsedCount(
    codeId: Types.ObjectId,
  ): Promise<PromoCodeDocument | null> {
    const now = new Date();
    return this.model.findOneAndUpdate(
      {
        _id: codeId,
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
        deleted_at: null,
        $or: [
          { maxUses: null },
          { $expr: { $lt: ['$usedCount', '$maxUses'] } },
        ],
      },
      { $inc: { usedCount: 1 } },
      { new: true },
    ).populate('teamId');
  }
}
