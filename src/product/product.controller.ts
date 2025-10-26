import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  BadRequestException,
  Put,
  Query,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import { productIdParamSchema } from '../common/schemas/product.schemas';
import {
  createProductMultipartSchema,
  simpleUpdateMultipartSchema,
} from './dto/create-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import {
  SetPriceDto,
  AddDiscountDto,
  UpdateDiscountDto,
  CalculatePriceDto,
} from './dto/pricing.dto';
import { ZodMultipart } from 'src/common/decorators/zod-multipart.decorator';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodMultipart(createProductMultipartSchema, 'productImage')
  async create(
    @Body() body: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    productImage?: Express.Multer.File,
  ) {
    try {
      const validated = body;
      return await this.productService.createProduct(
        validated as any,
        productImage,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product');
    }
  }

  @Put(':id')
  @ZodMultipart(simpleUpdateMultipartSchema, 'productImage')
  async update(
    @Param('id') id: string,
    @Body() body: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    productImage?: Express.Multer.File,
  ) {
    try {
      const validatedData = body;
      return await this.productService.update(id, validatedData, productImage);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update product');
    }
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get('search')
  async search(@Query('q') keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('Search keyword is required');
    }
    return this.productService.search(keyword.trim());
  }

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
      throw new BadRequestException(ERRORS.INVALID_DISCOUNT_INDEX);
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
      throw new BadRequestException(ERRORS.INVALID_DISCOUNT_INDEX);
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