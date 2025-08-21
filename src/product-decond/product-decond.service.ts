import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductDecond, ProductDecondDocument } from './product-decond.schema';
import { DetailProduct } from '../detail-product/detail-product.schema';
import { ImageProduct } from '../image-product/image-product.schema';

@Injectable()
export class ProductDecondService {
  constructor(
    @InjectModel(ProductDecond.name)
    private readonly productDecondModel: Model<ProductDecondDocument>,
    @InjectModel(DetailProduct.name)
    private readonly detailProductModel: Model<DetailProduct>,
    @InjectModel(ImageProduct.name)
    private readonly imageProductModel: Model<ImageProduct>,
  ) {}

  async create(data: Partial<ProductDecond>): Promise<ProductDecond> {
    const detailExists = await this.detailProductModel.exists({
      _id: data.detailProduct,
    });
    if (!detailExists) {
      throw new NotFoundException(
        `DetailProduct with ID ${data.detailProduct} not found`,
      );
    }

    const imageExists = await this.imageProductModel.exists({
      _id: data.image,
    });
    if (!imageExists) {
      throw new NotFoundException(
        `ImageProduct with ID ${data.image} not found`,
      );
    }

    const created = new this.productDecondModel(data);
    return created.save();
  }

  async findAll(): Promise<ProductDecond[]> {
    return this.productDecondModel
      .find()
      .populate('detailProduct')
      .populate('image')
      .exec();
  }

  async findOne(id: string): Promise<ProductDecond> {
    const product = await this.productDecondModel
      .findById(id)
      .populate('detailProduct')
      .populate('image')
      .exec();
    if (!product) {
      throw new NotFoundException(`ProductDecond with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateData: Partial<ProductDecond>,
  ): Promise<ProductDecond> {
    const updated = await this.productDecondModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`ProductDecond with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productDecondModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`ProductDecond with ID ${id} not found`);
    }
  }
}
