import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from '../common/errors';
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
      throw new NotFoundException(ERRORS.DETAIL_PRODUCT_NOT_FOUND);
    }

    const imageExists = await this.imageProductRepository.findById({
      id: data.image as unknown as string,
    });
    if (!imageExists) {
      throw new NotFoundException(ERRORS.IMAGE_NOT_FOUND);
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
      throw new NotFoundException(ERRORS.PRODUCT_DECOND_NOT_FOUND);
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
      throw new NotFoundException(ERRORS.PRODUCT_DECOND_NOT_FOUND);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const product = await this.productDecondRepository.findById({ id });
    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_DECOND_NOT_FOUND);
    }
    await this.productDecondRepository.delete({ id });
  }
}
