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
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import {
  createProductSchema,
  productIdParamSchema,
  updateSubcategoryParamSchema,
  simpleUpdateSchema,
  setPriceSchema,
  addDiscountSchema,
  updateDiscountSchema,
  calculatePriceSchema,
} from '../common/schemas/product.schemas';
import { ImageProductService } from 'src/image-product/image-product.service';
import { z } from 'zod';
import { memoryStorage } from 'multer';
import { CreateProductDto } from './dto/create-product.dto';
import {
  SetPriceDto,
  AddDiscountDto,
  UpdateDiscountDto,
  CalculatePriceDto,
} from './dto/pricing.dto';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly imageProductService: ImageProductService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
    @Body() body: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      // 1️⃣ Parser les données du formulaire
      const detailData =
        typeof body.detailData === 'string'
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
          errors: error.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`,
          ),
        });
      }

      // 6️⃣ Autres erreurs (JSON parse, etc.)
      if (error instanceof SyntaxError) {
        throw new BadRequestException({
          message: 'Invalid JSON format in detailData',
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
          detailData =
            typeof body.detailData === 'string'
              ? JSON.parse(body.detailData)
              : body.detailData;

          // Convertir expirationDate si nécessaire
          if (
            detailData?.expirationDate &&
            typeof detailData.expirationDate === 'string'
          ) {
            detailData.expirationDate = new Date(detailData.expirationDate);
          }
        } catch {
          throw new BadRequestException('Invalid JSON format in detailData');
        }
      }

      const dataToValidate: z.infer<typeof simpleUpdateSchema> = {};
      if (detailData) dataToValidate.detailData = detailData;
      if (body.subcategoryId) dataToValidate.subcategoryId = body.subcategoryId;
      if (body.isActive !== undefined)
        dataToValidate.isActive = body.isActive === true;
      if (file)
        dataToValidate.imageData = {
          altText: dataToValidate.imageData?.altText || '',
        };

      // 🔧 VALIDATION ZOD
      const validatedData = simpleUpdateSchema.parse(dataToValidate);

      return await this.productService.update(id, validatedData, file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`,
          ),
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

  // Pricing endpoints
  @UseGuards(JwtAuthGuard)
  @Post(':id/price')
  @CompoundZodValidation({ params: productIdParamSchema })
  async setPrice(
    @Param() params: { id: string },
    @Body() setPriceDto: SetPriceDto,
  ) {
    return this.productService.setPrice(
      params.id,
      setPriceDto.basePrice,
      setPriceDto.currency,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/discounts')
  @CompoundZodValidation({ params: productIdParamSchema })
  async addDiscount(
    @Param() params: { id: string },
    @Body() addDiscountDto: AddDiscountDto,
  ) {
    const discountData = {
      ...addDiscountDto,
      startDate: addDiscountDto.startDate
        ? new Date(addDiscountDto.startDate)
        : undefined,
      endDate: addDiscountDto.endDate
        ? new Date(addDiscountDto.endDate)
        : undefined,
    };
    return this.productService.addDiscount(params.id, discountData);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/discounts/:discountIndex')
  @CompoundZodValidation({ params: productIdParamSchema })
  async updateDiscount(
    @Param('id') id: string,
    @Param('discountIndex') discountIndex: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ) {
    const index = parseInt(discountIndex, 10);
    if (isNaN(index)) {
      throw new BadRequestException('Invalid discount index');
    }

    const updateData = {
      ...updateDiscountDto,
      startDate: updateDiscountDto.startDate
        ? new Date(updateDiscountDto.startDate)
        : undefined,
      endDate: updateDiscountDto.endDate
        ? new Date(updateDiscountDto.endDate)
        : undefined,
    };

    return this.productService.updateDiscount(id, index, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/discounts/:discountIndex')
  @CompoundZodValidation({ params: productIdParamSchema })
  async removeDiscount(
    @Param('id') id: string,
    @Param('discountIndex') discountIndex: string,
  ) {
    const index = parseInt(discountIndex, 10);
    if (isNaN(index)) {
      throw new BadRequestException('Invalid discount index');
    }

    return this.productService.removeDiscount(id, index);
  }

  @Get(':id/price')
  @CompoundZodValidation({ params: productIdParamSchema })
  async calculatePrice(
    @Param() params: { id: string },
    @Query() query: CalculatePriceDto,
  ) {
    const product = await this.productService.findOne(params.id);
    const quantity = query.quantity || 1;
    const calculateAt = query.calculateAt
      ? new Date(query.calculateAt)
      : undefined;

    return this.productService.calculatePrice(product, quantity, calculateAt);
  }

  @Get(':id/price/history')
  @CompoundZodValidation({ params: productIdParamSchema })
  async getPriceHistory(@Param() params: { id: string }) {
    const product = await this.productService.findOne(params.id);
    
    return {
      productId: params.id,
      basePrice: product.basePrice,
      currency: product.currency,
      discounts: product.discounts || [],
      currentPrice: product.basePrice
        ? this.productService.calculatePrice(product, 1)
        : null,
    };
  }
}
