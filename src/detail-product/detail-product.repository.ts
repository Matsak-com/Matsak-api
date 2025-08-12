import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { DetailProduct, DetailProductDocument } from './detail-product.schema';

@Injectable()
export class DetailProductRepository extends BaseRepository<DetailProductDocument> {
  constructor(
    @InjectModel(DetailProduct.name)
    detailProductModel: Model<DetailProductDocument>,
  ) {
    super(detailProductModel);
  }

}
