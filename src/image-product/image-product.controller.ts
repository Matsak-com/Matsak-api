import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Patch,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ImageProductService } from './image-product.service';
import { ImageProduct } from './image-product.schema';
import * as fs from 'fs';
import * as path from 'path';
import { CreateImageProductDto } from './dto/create-image-product.dto';
import { UpdateImageProductDto } from './dto/update-image-product.dto';

@Controller('image-product')
export class ImageProductController {
  constructor(private readonly imageProductService: ImageProductService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/image-products',
        filename: (req, file, callback) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('Seuls les fichiers image sont autorisés'), false);
        } else {
          callback(null, true);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('altText') altText: string,
      ) {
        const filePath = path.resolve('uploads', 'image-products', file.filename);

        // Crée le DTO manuellement
        const createImageDto: CreateImageProductDto = {
          filename: filePath,
          altText,
        };

    return this.imageProductService.create(createImageDto);
  }

  @Get()
  async findAll(): Promise<ImageProduct[]> {
    return this.imageProductService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ImageProduct> {
    return this.imageProductService.findOne(id);
  }

  @Patch(':id')
    async update(
      @Param('id') id: string,
      @Body() updateImageDto: UpdateImageProductDto,
    ) {
      const updatedImage = await this.imageProductService.update(id, updateImageDto);
      if (!updatedImage) {
        throw new NotFoundException(`Image with ID ${id} not found`);
      }
      return updatedImage;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    return this.imageProductService.remove(id);
  }
}
