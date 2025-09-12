import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  createProductSchema,
  productIdParamSchema,
  updateSubcategoryParamSchema,
  simpleUpdateSchema,
} from '../common/schemas/product.schemas';
import { ImageProductService } from 'src/image-product/image-product.service';
import { z } from 'zod';
import { memoryStorage } from 'multer';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService, 
    private readonly imageProductService: ImageProductService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
  @Body() body: CreateProductDto,
  @UploadedFile() file?: Express.Multer.File
  ) {
    try {
      // 1️⃣ Parser les données du formulaire
      const detailData = typeof body.detailData === 'string'
        ? JSON.parse(body.detailData)
        : body.detailData;

      // 2️⃣ Construire l'objet à valider
      const dataToValidate = {
        detailData,
        subcategoryId: body.subcategoryId,
        isActive: body.isActive === true,
      };

      // 3️⃣ Validation avec Zod
      const validatedData = createProductSchema.parse(dataToValidate);
      
      // 4️⃣ Créer le produit avec les données validées
      return this.productService.createProduct(validatedData, file);
      
    } catch (error) {
      // 5️⃣ Gestion des erreurs de validation Zod
      if (error instanceof z.ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          )
        });
      }
      
      // 6️⃣ Autres erreurs (JSON parse, etc.)
      if (error instanceof SyntaxError) {
        throw new BadRequestException({
          message: 'Invalid JSON format in detailData'
        });
      }
      
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async update(
    @Param('id') id: string,
    @Body() body: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {

      // Parser detailData si présent
      let detailData = undefined;
      if (body.detailData) {
        try {
          detailData = typeof body.detailData === 'string'
            ? JSON.parse(body.detailData)
            : body.detailData;
          
          // Convertir expirationDate si nécessaire
          if (detailData?.expirationDate && typeof detailData.expirationDate === 'string') {
            detailData.expirationDate = new Date(detailData.expirationDate);
          }
        } catch (parseError) {
          throw new BadRequestException('Invalid JSON format in detailData');
        }
      }

      const dataToValidate : z.infer<typeof simpleUpdateSchema> = {};
      if (detailData) dataToValidate.detailData = detailData;
      if (body.subcategoryId) dataToValidate.subcategoryId = body.subcategoryId;
      if (body.isActive !== undefined) dataToValidate.isActive = body.isActive === true;
      if (file) dataToValidate.imageData = { altText: dataToValidate.imageData?.altText || '' };

      // 🔧 VALIDATION ZOD
      const validatedData = simpleUpdateSchema.parse(dataToValidate);

      return await this.productService.update(id, validatedData, file);

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        });
      }
      throw error;
    }
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
