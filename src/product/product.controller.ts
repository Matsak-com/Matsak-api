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
  UploadedFiles,
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
import {
  productIdParamSchema,
  teamIdParamSchema,
  userIdParamSchema,
} from '../common/schemas/product.schemas';
import {
  createProductMultipartSchema,
  simpleUpdateMultipartSchema,
} from './dto/create-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  SetPriceDto,
  AddDiscountDto,
  UpdateDiscountDto,
  CalculatePriceDto,
} from './dto/pricing.dto';
import { ZodMultipartFiles } from 'src/common/decorators/zod-multipart-files.decorator';
import { Types } from 'mongoose';
import { MembersService } from 'src/members/members.service';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly membersService: MembersService,
  ) {}

  /**
   * Create a new product with multiple images
   * 
   * @param body Product data (form fields)
   * @param productImages Array of image files (max 10, 3MB each)
   * @returns Created product with populated images
   * 
   * @remarks
   * **BREAKING CHANGE (v2.0):** Field name changed from `productImage` (singular) 
   * to `productImages` (plural). Accepts multiple files as an array.
   * 
   * @example
   * ```
   * POST /products
   * Content-Type: multipart/form-data
   * 
   * productImages: <file1>
   * productImages: <file2>
   * name: "Product Name"
   * price: 100
   * ```
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodMultipartFiles(createProductMultipartSchema, 'productImages', 10)
  async create(
    @Body() body: CreateProductDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    productImages?: Express.Multer.File[],
  ) {
    try {
      const validated = body;
      
      // Backward compatibility: Support both 'productImages' (new) and 'productImage' (old)
      // Note: FilesInterceptor only captures one field name at a time
      // For true backward compatibility, clients should migrate to 'productImages'
      const files = productImages;
      
      return await this.productService.createProduct(
        validated as any,
        files,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create product: ${error.message}`,
      );
    }
  }

  /**
   * Update an existing product with new images
   *
   * @param id Product ID
   * @param body Updated product data
   * @param productImages Array of new image files (replaces existing images)
   * @returns Updated product with populated images
   *
   * @remarks
   * **BREAKING CHANGE (v2.0):** Field name changed from `productImage` to `productImages`.
   * When uploading new images, all existing images are replaced.
   *
   * @example
   * ```
   * PUT /products/:id
   * Content-Type: multipart/form-data
   *
   * productImages: <file1>
   * productImages: <file2>
   * name: "Updated Name"
   * ```
   */
  @Put(':id')
  @ZodMultipartFiles(simpleUpdateMultipartSchema, 'productImages', 10)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    productImages?: Express.Multer.File[],
  ) {
    try {
      const validatedData = body;
      return await this.productService.update(id, validatedData, productImages);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update product');
    }
  }

  @Get('search')
  async search(@Query('q') keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('Search keyword is required');
    }
    return this.productService.search(keyword.trim());
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  @CompoundZodValidation({ params: teamIdParamSchema })
  findByTeam(@Param() params: { teamId: string }) {
    return this.productService.findBy({
      filter: { team: new Types.ObjectId(params.teamId) },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  @CompoundZodValidation({ params: userIdParamSchema })
  async findByUser(@Param() params: { userId: string }) {
    const members = await this.membersService.getTeamMembersByUserId(
      params.userId,
    );
    const results = await this.productService.findBy({
      filter: { team: { $in: members.map((member) => member.team._id) } },
    });
    return results;
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