import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDetailProductDto } from './dto/create-detail-product.dto';
import { UpdateDetailProductDto } from './dto/update-detail-product.dto';
import { DetailProductRepository } from './detail-product.repository';
import { DetailProduct } from './detail-product.schema';

@Injectable()
export class DetailProductService {
  constructor(
    private readonly detailProductRepository: DetailProductRepository,
  ) {}

  async create(dto: CreateDetailProductDto): Promise<DetailProduct> {
    const created = await this.detailProductRepository.create(dto);
    return created;
  }

  async findAll(): Promise<DetailProduct[]> {
    const results = await this.detailProductRepository.findAll();
    return results;
  }

  async findOne(id: string): Promise<DetailProduct> {
    const item = await this.detailProductRepository.findById(id);
    if (!item) throw new NotFoundException(`DetailProduct ${id} not found`);
    return item;
  }

  async update(
    id: string,
    dto: UpdateDetailProductDto,
  ): Promise<DetailProduct> {
    const updated = await this.detailProductRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`DetailProduct ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.detailProductRepository.delete(id);
    if (!result) throw new NotFoundException(`DetailProduct ${id} not found`);
    return { deleted: true };
  }
}
