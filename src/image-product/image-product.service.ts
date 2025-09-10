import { ImageProductRepository } from './image-product.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ImageProduct, ImageProductDocument } from './image-product.schema'; // 👈 ajoute ImageProductDocument
import { CreateImageProductDto } from './dto/create-image-product.dto';
import { encodeImageToBase64 } from 'src/helpers/base64.helper';
import * as path from 'path';
import { UpdateImageProductDto } from './dto/update-image-product.dto';
import * as fs from 'fs';

@Injectable()
export class ImageProductService {
  constructor(private readonly imageProductRepo: ImageProductRepository) {}

  async createFromBuffer({
    buffer,
    originalname,
    mimetype,
    altText,
  }: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    altText?: string;
  }): Promise<ImageProductDocument> {
    const imageToSave = {
      data: buffer.toString('base64'),
      mimeType: mimetype,
      name: originalname,
      altText: altText || '',
    };

    return this.imageProductRepo.create(imageToSave);
  }


  async create(createImageDto: CreateImageProductDto): Promise<ImageProductDocument> {
    const filePath = path.resolve(
      'uploads',
      'image-products',
      createImageDto.filename,
    );

    const { mimeType, data } = encodeImageToBase64(filePath);

    const imageToSave = {
      mimeType,
      data,
      altText: createImageDto.altText || '',
      name: path.basename(createImageDto.filename),
    };
    const savedImage = await this.imageProductRepo.create(imageToSave);
    
    return savedImage;
  }

  async findAll(): Promise<ImageProductDocument[]> {
    return this.imageProductRepo.findAll();
  }
  async findOne(id: string): Promise<ImageProductDocument> {
    return this.imageProductRepo.findById(id);
  }

  async update(
    id: string,
    updateImageDto: UpdateImageProductDto,
  ): Promise<ImageProductDocument> {
    const existingImage = await this.imageProductRepo.findById(id);
      
    if (!existingImage) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    let updateData: Partial<ImageProduct> = { ...updateImageDto };

    if (updateImageDto.filename) {
      const oldFilePath = path.resolve(
        'uploads',
        'image-products',
        existingImage.name,
      );
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (error) {
          console.warn(
            `Erreur de suppression de l'ancien fichier : ${error.message}`,
          );
        }
      }

      const newFilePath = path.resolve(
        'uploads',
        'image-products',
        updateImageDto.filename,
      );
      const { mimeType, data } = encodeImageToBase64(newFilePath);

      updateData = {
        ...updateData,
        mimeType,
        data,
        name: path.basename(updateImageDto.filename),
      };
    }


    return this.imageProductRepo.update(id, updateData);
  }

  async remove(id: string): Promise<any> {
    return this.imageProductRepo.delete(id);

  }
}
