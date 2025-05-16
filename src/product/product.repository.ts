import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Product, ProductDocument } from './product.schema';

@Injectable()
export class ProductRepository extends BaseRepository<ProductDocument> {
  constructor(
    @InjectModel(Product.name)
    productModel: Model<ProductDocument>,
  ) {
    super(productModel);
  }
}
