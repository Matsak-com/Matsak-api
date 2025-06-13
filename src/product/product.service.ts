import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { ImageProductRepository } from '../image-product/image-product.repository';
import { Types } from 'mongoose';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly detailRepo: DetailProductRepository,
    private readonly imageRepo: ImageProductRepository,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdDetail = await this.detailRepo.create(createProductDto.detailData);
    const createdImage = await this.imageRepo.create(createProductDto.imageData);

    const productToCreate: Partial<Product> = {
      detail: createdDetail._id as Types.ObjectId,
      images: createdImage._id as Types.ObjectId,
      subcategory: new Types.ObjectId(createProductDto.subcategoryId),
      team: new Types.ObjectId(createProductDto.teamId),
    };

    return this.productRepo.create(productToCreate);
  }



  async findAll(): Promise<Product[]> {
    return this.productRepo.findAll(null, {
      populate: ['detail', 'subcategory', 'team', 'images'],
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findById(id, {
      populate: ['detail', 'subcategory', 'team', 'images'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const updatedProduct = await this.productRepo.update(id, updateProductDto);
    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productRepo.delete(id);
    if (!result) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
  }

  async updateSubcategory(id: string, subcategoryId: string): Promise<Product> {
    const updatedProduct = await this.productRepo.update(id, {
      subcategory: new Types.ObjectId(subcategoryId),
    });
    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return updatedProduct;
  }
}
