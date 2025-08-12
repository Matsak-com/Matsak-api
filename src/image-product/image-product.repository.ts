import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { ImageProduct, ImageProductDocument } from './image-product.schema';
@Injectable()
export class ImageProductRepository extends BaseRepository<ImageProductDocument> {
  save(imageToSave: { mimeType: string; data: string; altText: string; name: string; }): ImageProduct | PromiseLike<ImageProduct> {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectModel(ImageProduct.name)
    imageProductModel: Model<ImageProductDocument>,
  ) {
    super(imageProductModel);
  }

  // You can add custom methods here if needed
}
