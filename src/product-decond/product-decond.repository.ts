import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDecond, ProductDecondDocument } from './product-decond.schema';
import { BaseRepository } from '../common/base.repository';

@Injectable()
export class ProductDecondRepository extends BaseRepository<ProductDecondDocument> {
  constructor(
    @InjectModel(ProductDecond.name)
    entityModel: Model<ProductDecondDocument>,
  ) {
    super(entityModel);
  }
}
