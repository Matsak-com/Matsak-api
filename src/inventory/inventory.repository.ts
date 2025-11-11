import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { InventoryTransaction } from './inventory.schema';

@Injectable()
export class InventoryRepository extends BaseRepository<InventoryTransaction> {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private inventoryModel: Model<InventoryTransaction>,
  ) {
    super(inventoryModel);
  }
}
