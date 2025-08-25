import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { ImageProductRepository } from '../image-product/image-product.repository';
import { Types } from 'mongoose';
import { ImageProductService } from 'src/image-product/image-product.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly detailRepo: DetailProductRepository,
    private readonly imageservice: ImageProductService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdDetail = await this.detailRepo.create({
      doc: createProductDto.detailData,
    });

    const productToCreate: Partial<Product> = {
      detail: createdDetail._id as Types.ObjectId,
      images: new Types.ObjectId(createProductDto.imageId),
      subcategory: new Types.ObjectId(createProductDto.subcategoryId),
    };

    return this.productRepo.create({ doc: productToCreate });
  }

  async findAll(): Promise<Product[]> {
    return this.productRepo.findAll({
      filter: null,
      options: {
        populate: ['detail', 'subcategory', 'images'],
      },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findById({
      id,
      options: {
        populate: ['detail', 'subcategory', 'images'],
      },
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
    const existingProduct = await this.productRepo.findById({ id });
    if (!existingProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    if (updateProductDto.detailData) {
      await this.detailRepo.update({
        id: existingProduct.detail.toString(),
        update: updateProductDto.detailData,
      });
    }

    if (updateProductDto.imageData) {
      await this.imageservice.update(
        existingProduct.images.toString(),
        updateProductDto.imageData,
      );
    }

    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        ...(updateProductDto.subcategoryId && {
          subcategory: new Types.ObjectId(updateProductDto.subcategoryId),
        }),
        ...(typeof updateProductDto.isActive !== 'undefined' && {
          isActive: updateProductDto.isActive,
        }),
        updatedAt: new Date(),
      },
    });

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productRepo.delete({ id });
    if (!result) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
  }

  async updateSubcategory(id: string, subcategoryId: string): Promise<Product> {
    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        subcategory: new Types.ObjectId(subcategoryId),
      },
    });
    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return updatedProduct;
  }
}
