import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
}
