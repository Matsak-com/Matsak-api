import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { ImageProduct, ImageProductDocument } from './image-product.schema';
@Injectable()
export class ImageProductRepository extends BaseRepository<ImageProductDocument> {
  async save(imageToSave: {
    mimeType: string;
    data: string;
    altText: string;
    name: string;
  }): Promise<ImageProduct> {
    const imageProduct = new (this.model as Model<ImageProductDocument>)({
      mimeType: imageToSave.mimeType,
      data: imageToSave.data,
      altText: imageToSave.altText,
      name: imageToSave.name,
    });
    return await imageProduct.save();
  }
  constructor(
    @InjectModel(ImageProduct.name)
    imageProductModel: Model<ImageProductDocument>,
  ) {
    super(imageProductModel);
  }

  // You can add custom methods here if needed
}
