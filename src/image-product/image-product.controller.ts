import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ImageProductService } from './image-product.service';
import { ImageProduct } from './image-product.schema';
import * as fs from 'fs';
import * as path from 'path';

@Controller('image-product')
export class ImageProductController {
  constructor(private readonly imageProductService: ImageProductService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/image-products',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
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
    @Body() body: any,
  ): Promise<ImageProduct> {
    if (!file) {
      throw new BadRequestException('Aucun fichier valide n’a été fourni');
    }

    // Vérification des champs body
    if (!body.altText || !body.type) {
      // Supprimer le fichier uploadé si les champs sont invalides
      fs.unlinkSync(path.join(__dirname, '..', '..', 'uploads', 'image-products', file.filename));
      throw new BadRequestException('altText et type sont requis');
    }

    const image = {
      filename: file.filename,
      url: `/uploads/image-products/${file.filename}`,
      altText: body.altText,
      type: body.type,
    };

    return this.imageProductService.create(image);
  }

  @Get()
  async findAll(): Promise<ImageProduct[]> {
    return this.imageProductService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ImageProduct> {
    return this.imageProductService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateImageDto: any,
  ): Promise<ImageProduct> {
    return this.imageProductService.update(id, updateImageDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    return this.imageProductService.remove(id);
  }
}
