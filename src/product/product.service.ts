import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(private readonly productRepo: ProductRepository) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = await this.productRepo.create(createProductDto);
    return createdProduct;
  }

  async findAll(): Promise<Product[]> {
    const results = await this.productRepo.findAll(null, {
      populate: ['detail', 'subcategory', 'team', 'images'],
    });
    return results;
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

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
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
}
