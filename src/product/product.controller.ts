import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  NotFoundException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Product } from './product.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { CreateDetailProductDto } from 'src/detail-product/dto/create-detail-product.dto';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  updateSubcategoryParamSchema,
} from '../common/schemas/product.schemas';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ZodValidation(createProductSchema)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  // @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.productService.findAll();
  }

  // @UseGuards(JwtAuthGuard)
  @Get(':id')
  @CompoundZodValidation({ params: productIdParamSchema })
  findOne(@Param() params: { id: string }) {
    return this.productService.findOne(params.id);
  }

  // @UseGuards(JwtAuthGuard) // Ajouté pour sécuriser cette route
  @Patch(':id')
  @CompoundZodValidation({ params: productIdParamSchema })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/image-products',
        filename: (req, file, callback) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          callback(null, uniqueName);
        },
      }),
    }),
  )
  async updateImage(
    @Param() params: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ): Promise<Product> {
    // Parse des champs reçus dans le formulaire
    const updateDto: UpdateProductDto = {
      detailData: body.detailData ? JSON.parse(body.detailData) : undefined,
      subcategoryId: body.subcategoryId || undefined,
      isActive:
        body.isActive !== undefined && body.isActive !== null
          ? body.isActive === 'true' || body.isActive === true
          : undefined,
      imageData: body.imageData ? JSON.parse(body.imageData) : undefined,
    };

    // Si un fichier est envoyé, on remplace l'image
    if (file) {
      const filePath = path.resolve('uploads', 'image-products', file.filename);

      updateDto.imageData = {
        filename: filePath,
        altText: body.altText || '',
      };
    }

    const updatedProduct = await this.productService.update(
      params.id,
      updateDto,
    );

    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${params.id} not found`);
    }

    return updatedProduct;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @CompoundZodValidation({ params: productIdParamSchema })
  remove(@Param() params: { id: string }) {
    return this.productService.remove(params.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/subcategory/:subcategoryId')
  @CompoundZodValidation({ params: updateSubcategoryParamSchema })
  updateSubcategory(@Param() params: { id: string; subcategoryId: string }) {
    return this.productService.updateSubcategory(
      params.id,
      params.subcategoryId,
    );
  }
}
