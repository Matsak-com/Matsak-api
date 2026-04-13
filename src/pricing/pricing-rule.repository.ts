import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import {
  PricingRule,
  PricingRuleDocument,
  PricingRuleType,
} from './schemas/pricing-rule.schema';

@Injectable()
export class PricingRuleRepository extends BaseRepository<PricingRuleDocument> {
  constructor(
    @InjectModel(PricingRule.name)
    model: Model<PricingRuleDocument>,
  ) {
    super(model);
  }

  async findActiveForTeam(
    teamId: string | Types.ObjectId | null,
    type?: PricingRuleType,
  ): Promise<PricingRuleDocument[]> {
    const now = new Date();
    const filter: Record<string, any> = {
      isActive: true,
      $or: [
        { teamId: teamId ? new Types.ObjectId(teamId.toString()) : null },
        { teamId: null }, // global rules
      ],
      $and: [
        { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
        { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
      ],
    };
    if (type) filter.type = type;

    return this.findAll({ filter });
  }
}
