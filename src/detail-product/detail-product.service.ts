import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { UpdateDetailProductDto } from './dto/update-detail-product.dto';
import { DetailProductRepository } from './detail-product.repository';
import { DetailProduct } from './detail-product.schema';
import { CreateDetailProductDto } from '../common/schemas/product.schemas';
import { Types } from 'mongoose';

@Injectable()
export class DetailProductService {
  constructor(
    private readonly detailProductRepository: DetailProductRepository,
  ) {}

  async create(dto: CreateDetailProductDto): Promise<DetailProduct> {
    const docToCreate: any = {
      ...dto,
      // Convert string to Date if expirationDate exists
      ...(dto.expirationDate && {
        expirationDate: new Date(dto.expirationDate),
      }),
    };

    // Convert categoryId and subcategoryId to ObjectIds
    if (dto.categoryId) {
      docToCreate.category = new Types.ObjectId(dto.categoryId);
      delete docToCreate.categoryId;
    }

    if (dto.subcategoryId) {
      docToCreate.subcategory = new Types.ObjectId(dto.subcategoryId);
      delete docToCreate.subcategoryId;
    }

    const created = await this.detailProductRepository.create({
      doc: docToCreate,
    });
    return created;
  }

  async findAll(): Promise<DetailProduct[]> {
    const results = await this.detailProductRepository.findAll();
    return results;
  }

  async findOne(id: string): Promise<DetailProduct> {
    const item = await this.detailProductRepository.findById({ id });
    if (!item) throw new NotFoundException(ERRORS.DETAIL_PRODUCT_NOT_FOUND);
    return item;
  }

  async update(
    id: string,
    dto: UpdateDetailProductDto,
  ): Promise<DetailProduct> {
    const updateData: any = { ...dto };

    if (dto.categoryId) {
      updateData.category = new Types.ObjectId(dto.categoryId);
      delete updateData.categoryId;
    }

    if (dto.subcategoryId) {
      updateData.subcategory = new Types.ObjectId(dto.subcategoryId);
      delete updateData.subcategoryId;
    } else if (
      dto.subcategoryId === null ||
      dto.subcategoryId === '' ||
      !dto.subcategoryId
    ) {
      updateData.subcategory = null;
    }

    const updated = await this.detailProductRepository.update({
      id,
      update: updateData,
    });
    if (!updated) throw new NotFoundException(ERRORS.DETAIL_PRODUCT_NOT_FOUND);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.detailProductRepository.delete({ id });
    if (!result) throw new NotFoundException(ERRORS.DETAIL_PRODUCT_NOT_FOUND);
    return { deleted: true };
  }
}
