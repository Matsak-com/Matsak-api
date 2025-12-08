import { ImageProductRepository } from './image-product.repository';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { ImageProduct, ImageProductDocument } from './image-product.schema';
import { CreateImageProductDto } from './dto/create-image-product.dto';
import { encodeImageToBase64 } from '../helpers/base64.helper';
import * as path from 'path';
import { UpdateImageProductDto } from './dto/update-image-product.dto';
import * as fs from 'fs';
import { Types } from 'mongoose';

@Injectable()
export class ImageProductService {
  constructor(private readonly imageProductRepo: ImageProductRepository) {}

  async upload({
    buffer,
    originalname,
    mimetype,
  }: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<ImageProductDocument> {
    const imageToSave = {
      data: buffer.toString('base64'),
      mimeType: mimetype,
      name: originalname,
    };

    // ✅ Use standard BaseRepository create method
    return this.imageProductRepo.create({ doc: imageToSave });
  }

  async create(
    createImageDto: CreateImageProductDto,
  ): Promise<ImageProductDocument> {
    const filePath = path.resolve(
      'uploads',
      'image-products',
      createImageDto.filename,
    );

    const { mimeType, data } = encodeImageToBase64(filePath);

    const imageToSave = {
      mimeType,
      data,
      name: path.basename(createImageDto.filename),
    };
    const savedImage = await this.imageProductRepo.create({ doc: imageToSave });

    return savedImage;
  }

  async findAll(): Promise<ImageProductDocument[]> {
    // ✅ Use standard BaseRepository findAll method
    return this.imageProductRepo.findAll();
  }
  async findOne(id: string): Promise<ImageProductDocument | null> {
    // ✅ Use standard BaseRepository findById method
    return this.imageProductRepo.findById({ id });
  }

  async findMany(ids: string[]): Promise<ImageProductDocument[]> {
    const invalidIds = ids.filter((id) => !Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid ObjectId(s) provided: ${invalidIds.join(', ')}`,
      );
    }
    return this.imageProductRepo.findAll({
      filter: { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } },
    });
  }

  async update(
    id: string,
    updateImageDto: UpdateImageProductDto,
  ): Promise<ImageProductDocument> {
    // ✅ Use standard BaseRepository findById method
    const existingImage = await this.imageProductRepo.findById({ id });

    if (!existingImage) {
      throw new NotFoundException(ERRORS.IMAGE_NOT_FOUND);
    }

    let updateData: Partial<ImageProduct> = {};

    // Only update filename if provided
    if (updateImageDto.filename) {
      updateData.name = updateImageDto.filename;
    }

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

    return this.imageProductRepo.update({ id, update: updateData });
  }

  async remove(id: string): Promise<any> {
    // ✅ Use simplified structure with { id }
    return this.imageProductRepo.delete({ id });
  }

  // 🆕 Alternative method using the custom save method from repository
  async createUsingSave(
    createImageDto: CreateImageProductDto,
  ): Promise<ImageProduct> {
    const filePath = path.resolve(
      'uploads',
      'image-products',
      createImageDto.filename,
    );

    const { mimeType, data } = encodeImageToBase64(filePath);

    const imageToSave = {
      mimeType,
      data,
      name: path.basename(createImageDto.filename),
    };

    return this.imageProductRepo.create({ doc: imageToSave });
  }

  // 🆕 Alternative method using custom save for buffer
  async createFromBufferUsingSave({
    buffer,
    originalname,
    mimetype,
  }: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<ImageProduct> {
    const imageToSave = {
      data: buffer.toString('base64'),
      mimeType: mimetype,
      name: originalname,
    };

    return this.imageProductRepo.create({ doc: imageToSave });
  }

  // 🔧 Enhanced methods with validation and error handling

  /**
   * Create image with validation and error handling
   */
  async createSafely(
    createImageDto: CreateImageProductDto,
  ): Promise<ImageProductDocument> {
    try {
      const filePath = path.resolve(
        'uploads',
        'image-products',
        createImageDto.filename,
      );

      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(ERRORS.IMAGE_NOT_FOUND);
      }

      return await this.create(createImageDto);
    } catch (error) {
      console.error(`Error creating image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create image from buffer with validation
   */
  async createFromBufferSafely({
    buffer,
    originalname,
    mimetype,
  }: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<ImageProductDocument> {
    try {
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new BadRequestException(ERRORS.INVALID_BUFFER);
      }

      // Validate mimetype
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];
      if (!allowedTypes.includes(mimetype)) {
        throw new BadRequestException(ERRORS.INVALID_IMAGE_TYPE);
      }

      return await this.upload({
        buffer,
        originalname,
        mimetype,
      });
    } catch (error) {
      console.error(`Error creating image from buffer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find image by ID with proper error handling
   */
  async findOneSafely(id: string): Promise<ImageProductDocument> {
    try {
      const image = await this.findOne(id);

      if (!image) {
        throw new NotFoundException(ERRORS.IMAGE_NOT_FOUND);
      }

      return image;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error finding image: ${error.message}`);
      throw new NotFoundException(ERRORS.IMAGE_NOT_FOUND);
    }
  }

  /**
   * Remove with proper cleanup
   */
  async removeSafely(id: string): Promise<any> {
    try {
      // Get image info before deletion for cleanup
      const existingImage = await this.findOneSafely(id);

      // Delete from database
      const result = await this.remove(id);

      // Clean up physical file if it exists
      if (existingImage.name) {
        const filePath = path.resolve(
          'uploads',
          'image-products',
          existingImage.name,
        );

        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Successfully deleted file: ${filePath}`);
          } catch (fileError) {
            console.warn(
              `Warning: Could not delete file ${filePath}: ${fileError.message}`,
            );
            // Don't throw error for file cleanup failure
          }
        }
      }

      return result;
    } catch (error) {
      console.error(`Error removing image ${id}: ${error.message}`);
      throw error;
    }
  }
}
