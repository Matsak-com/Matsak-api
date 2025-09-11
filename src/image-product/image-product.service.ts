import { ImageProductRepository } from './image-product.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ImageProduct, ImageProductDocument } from './image-product.schema';
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

    // ✅ Use standard BaseRepository create method
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
<<<<<<< HEAD

    // ✅ Use standard BaseRepository create method
    const savedImage = await this.imageProductRepo.create(imageToSave);

=======
    const savedImage = await this.imageProductRepo.create(imageToSave);
    
>>>>>>> 20768a51c14f6eec52bfca2e68b277b33cde8134
    return savedImage;
  }

  async findAll(): Promise<ImageProductDocument[]> {
    // ✅ Use standard BaseRepository findAll method
    return this.imageProductRepo.findAll();
  }
  async findOne(id: string): Promise<ImageProductDocument> {
    // ✅ Use standard BaseRepository findById method
    return this.imageProductRepo.findById(id);
  }

  async update(
    id: string,
    updateImageDto: UpdateImageProductDto,
  ): Promise<ImageProductDocument> {
    // ✅ Use standard BaseRepository findById method
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

<<<<<<< HEAD
    // ✅ Use standard BaseRepository update method
=======

>>>>>>> 20768a51c14f6eec52bfca2e68b277b33cde8134
    return this.imageProductRepo.update(id, updateData);
  }

  async remove(id: string): Promise<any> {
<<<<<<< HEAD
    // ✅ Use simplified structure with { id }
    return this.imageProductRepo.delete({ id });
=======
    return this.imageProductRepo.delete(id);

>>>>>>> 20768a51c14f6eec52bfca2e68b277b33cde8134
  }

  // 🆕 Alternative method using the custom save method from repository
  async createUsingSave(createImageDto: CreateImageProductDto): Promise<ImageProduct> {
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

    // ✅ Use the custom save method from ImageProductRepository
    return this.imageProductRepo.save(imageToSave);
  }

  // 🆕 Alternative method using custom save for buffer
  async createFromBufferUsingSave({
    buffer,
    originalname,
    mimetype,
    altText,
  }: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    altText?: string;
  }): Promise<ImageProduct> {
    const imageToSave = {
      data: buffer.toString('base64'),
      mimeType: mimetype,
      name: originalname,
      altText: altText || '',
    };

    // ✅ Use the custom save method from ImageProductRepository
    return this.imageProductRepo.save(imageToSave);
  }

  // 🔧 Enhanced methods with validation and error handling

  /**
   * Create image with validation and error handling
   */
  async createSafely(createImageDto: CreateImageProductDto): Promise<ImageProductDocument> {
    try {
      const filePath = path.resolve(
        'uploads',
        'image-products',
        createImageDto.filename,
      );

      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`Image file not found: ${createImageDto.filename}`);
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
    altText,
  }: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    altText?: string;
  }): Promise<ImageProductDocument> {
    try {
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid buffer provided');
      }

      // Validate mimetype
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid image type: ${mimetype}`);
      }

      return await this.createFromBuffer({
        buffer,
        originalname,
        mimetype,
        altText,
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
        throw new NotFoundException(`Image with ID ${id} not found`);
      }

      return image;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error finding image: ${error.message}`);
      throw new NotFoundException(`Image with ID ${id} not found`);
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