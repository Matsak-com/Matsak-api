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
import { ImageProductService } from './image-product.service';
import { ImageProduct } from './image-product.schema';
import * as path from 'path';
import { CreateImageProductDto } from './dto/create-image-product.dto';
import { UpdateImageProductDto } from './dto/update-image-product.dto';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import { updateImageProductSchema } from '../common/schemas/product.schemas';
import { idParamSchema } from '../common/schemas/common.schemas';
import { ERRORS } from '../common/errors';

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
          callback(
            new BadRequestException(ERRORS.ONLY_IMAGE_FILES_ARE_ALLOWED),
            false,
          );
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
  @CompoundZodValidation({ params: idParamSchema })
  async findOne(@Param() params: { id: string }): Promise<ImageProduct> {
    return this.imageProductService.findOne(params.id);
  }

  @Patch(':id')
  @CompoundZodValidation({
    params: idParamSchema,
    body: updateImageProductSchema,
  })
  async update(
    @Param() params: { id: string },
    @Body() updateImageDto: UpdateImageProductDto,
  ) {
    const updatedImage = await this.imageProductService.update(
      params.id,
      updateImageDto,
    );
    if (!updatedImage) {
      throw new NotFoundException(ERRORS.IMAGE_NOT_FOUND);
    }
    return updatedImage;
  }

  @Delete(':id')
  @CompoundZodValidation({ params: idParamSchema })
  async remove(@Param() params: { id: string }): Promise<any> {
    return this.imageProductService.remove(params.id);
  }
}
