// stock-lot.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { StockLot } from './inventory.schema';

@Injectable()
export class StockLotRepository extends BaseRepository<StockLot> {
  constructor(
    @InjectModel(StockLot.name)
    private stockLotModel: Model<StockLot>,
  ) {
    super(stockLotModel);
  }

  async findExpiringLots(params: {
    horizon: Date;
    teamId?: string;
  }): Promise<StockLot[]> {
    const filter: any = {
      quantity: { $gt: 0 },
      deleted_at: null,
      expirationDate: { $lte: params.horizon },
    };

    if (params.teamId) {
      filter.team = new Types.ObjectId(params.teamId);
    }

    return this.findAll({
      filter,
      options: {
        populate: [{ path: 'product', populate: { path: 'detail' } }],
        sort: { expirationDate: 1 },
      },
    });
  }
}
