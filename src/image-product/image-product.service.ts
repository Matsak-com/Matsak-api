import { ImageProductRepository } from './image-product.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ImageProduct } from './image-product.schema';
import { CreateImageProductDto } from './dto/create-image-product.dto';
import { encodeImageToBase64 } from 'src/helpers/base64.helper';
import * as path from 'path';
import { UpdateImageProductDto } from './dto/update-image-product.dto';
import * as fs from 'fs';

@Injectable()
export class ImageProductService {
  constructor(private readonly imageProductRepo: ImageProductRepository) {}

  async create(createImageDto: CreateImageProductDto): Promise<ImageProduct> {
     console.log('> Reçu DTO :', createImageDto);

      const filePath = path.resolve('uploads', 'image-products',createImageDto.filename);
      console.log('> Chemin absolu de l\'image :', filePath);

      const { mimeType, data } = encodeImageToBase64(filePath);
      console.log('> Image encodée. MimeType:', mimeType, 'Data (truncated):', data?.substring(0, 50));

    const imageToSave = {
      mimeType,
      data,
      altText: createImageDto.altText || '',
      name: path.basename(createImageDto.filename),
    };

    const savedImage = await this.imageProductRepo.create(imageToSave);
    console.log('> Image enregistrée avec ID :', savedImage.id);

    return savedImage.id;
  }

  async findAll(): Promise<ImageProduct[]> {
    const results = await this.imageProductRepo.findAll();
    return results;
  }

  async findOne(id: string): Promise<ImageProduct> {
    const result = await this.imageProductRepo.findById(id);
    return result;
  }


  async update(id: string, updateImageDto: UpdateImageProductDto): Promise<ImageProduct> {
    const existingImage = await this.imageProductRepo.findById(id);

    if (!existingImage) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    let updateData: Partial<ImageProduct> = { ...updateImageDto };

    if (updateImageDto.filename) {
      const oldFilePath = path.resolve('uploads', 'image-products', existingImage.name);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log(`Ancien fichier supprimé : ${oldFilePath}`);
        } catch (error) {
          console.warn(`Erreur de suppression de l'ancien fichier : ${error.message}`);
        }
      }

      const newFilePath = path.resolve('uploads', 'image-products', updateImageDto.filename);
      const { mimeType, data } = encodeImageToBase64(newFilePath);

      updateData = {
        ...updateData,
        mimeType,
        data,
        name: path.basename(updateImageDto.filename),
      };
    }

    const updatedImage = await this.imageProductRepo.update(id, updateData);

    return updatedImage;
  }



  async remove(id: string): Promise<any> {
    const result = await this.imageProductRepo.delete(id);
    return result;
  }
}
