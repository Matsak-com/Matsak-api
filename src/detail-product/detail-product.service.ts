import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DetailProduct, DetailProductDocument } from './detail-product.schema';
import { CreateDetailProductDto } from './dto/create-detail-product.dto';
import { UpdateDetailProductDto } from './dto/update-detail-product.dto';

@Injectable()
export class DetailProductService {
  constructor(
    @InjectModel(DetailProduct.name)
    private readonly detailProductModel: Model<DetailProductDocument>,
  ) {}

  async create(dto: CreateDetailProductDto): Promise<DetailProduct> {
    const created = new this.detailProductModel(dto);
    return created.save();
  }

  async findAll(): Promise<DetailProduct[]> {
    return this.detailProductModel.find().exec();
  }

  async findOne(id: string): Promise<DetailProduct> {
    const item = await this.detailProductModel.findById(id).exec();
    if (!item) throw new NotFoundException(`DetailProduct ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateDetailProductDto): Promise<DetailProduct> {
    const updated = await this.detailProductModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) throw new NotFoundException(`DetailProduct ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.detailProductModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`DetailProduct ${id} not found`);
    return { deleted: true };
  }
}
