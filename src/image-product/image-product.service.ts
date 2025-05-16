import { ImageProductRepository } from './image-product.repository';
import { Injectable } from '@nestjs/common';
import { ImageProduct } from './image-product.schema';

@Injectable()
export class ImageProductService {
  constructor(private readonly imageProductRepo: ImageProductRepository) {}

  async create(createImageDto: any): Promise<ImageProduct> {
    const createdImage = await this.imageProductRepo.create(createImageDto);
    return createdImage;
  }

  async findAll(): Promise<ImageProduct[]> {
    const results = await this.imageProductRepo.findAll();
    return results;
  }

  async findOne(id: string): Promise<ImageProduct> {
    const result = await this.imageProductRepo.findById(id);
    return result;
  }

  async update(id: string, updateImageDto: any): Promise<ImageProduct> {
    const result = await this.imageProductRepo.update(id, updateImageDto);
    return result;
  }

  async remove(id: string): Promise<any> {
    const result = await this.imageProductRepo.delete(id);
    return result;
  }
}
