import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImageProduct, ImageProductDocument } from './image-product.schema';

@Injectable()
export class ImageProductService {
  constructor(
    @InjectModel(ImageProduct.name) private imageProductModel: Model<ImageProductDocument>,
  ) {}

  
  async create(createImageDto: any): Promise<ImageProduct> {
    const createdImage = new this.imageProductModel(createImageDto);
    return createdImage.save();
  }

  
  async findAll(): Promise<ImageProduct[]> {
    return this.imageProductModel.find().exec();
  }

  
  async findOne(id: string): Promise<ImageProduct> {
    return this.imageProductModel.findById(id).exec();
  }

  
  async update(id: string, updateImageDto: any): Promise<ImageProduct> {
    return this.imageProductModel.findByIdAndUpdate(id, updateImageDto, { new: true }).exec();
  }

  
  async remove(id: string): Promise<any> {
    return this.imageProductModel.findByIdAndDelete(id).exec();
  }
}
