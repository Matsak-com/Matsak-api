import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductDecond } from './product-decond.schema';
import { ProductDecondRepository } from './product-decond.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { ImageProductRepository } from '../image-product/image-product.repository';

@Injectable()
export class ProductDecondService {
  constructor(
    private readonly productDecondRepository: ProductDecondRepository,
    private readonly detailProductRepository: DetailProductRepository,
    private readonly imageProductRepository: ImageProductRepository,
  ) {}

  async create(data: Partial<ProductDecond>): Promise<ProductDecond> {
    const detailExists = await this.detailProductRepository.findById({
      id: data.detailProduct as unknown as string,
    });
    if (!detailExists) {
      throw new NotFoundException(
        `DetailProduct with ID ${data.detailProduct} not found`,
      );
    }

    const imageExists = await this.imageProductRepository.findById({
      id: data.image as unknown as string,
    });
    if (!imageExists) {
      throw new NotFoundException(
        `ImageProduct with ID ${data.image} not found`,
      );
    }

    return this.productDecondRepository.create({ doc: data });
  }

  async findAll(): Promise<ProductDecond[]> {
    return this.productDecondRepository.findAll({
      filter: {},
      options: {
        populate: ['detailProduct', 'image'],
      },
    });
  }

  async findOne(id: string): Promise<ProductDecond> {
    const product = await this.productDecondRepository.findById({
      id,
      options: {
        populate: ['detailProduct', 'image'],
      },
    });
    if (!product) {
      throw new NotFoundException(`ProductDecond with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateData: Partial<ProductDecond>,
  ): Promise<ProductDecond> {
    const updated = await this.productDecondRepository.update({
      id,
      update: updateData,
    });
    if (!updated) {
      throw new NotFoundException(`ProductDecond with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const product = await this.productDecondRepository.findById({ id });
    if (!product) {
      throw new NotFoundException(`ProductDecond with ID ${id} not found`);
    }
    await this.productDecondRepository.delete({ id });
  }
}
