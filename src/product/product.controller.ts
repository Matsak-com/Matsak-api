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
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { ERRORS } from '../common/errors';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
import { ZodMultipartFiles } from '../common/decorators/zod-multipart-files.decorator';
import { Types } from 'mongoose';
import { MembersService } from '../members/members.service';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { UserPayload } from '../auth/jwt/jwt.strategy';
import { UserRole } from '../users/user.schema';

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

      return await this.productService.createProduct(validated as any, files);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(ERRORS.PRODUCT_CREATION_FAILED);
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
      throw new BadRequestException(ERRORS.PRODUCT_UPDATE_FAILED);
    }
  }

  @Get('search')
  async search(@Query('q') keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException(ERRORS.SEARCH_KEYWORD_REQUIRED);
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
  async findByUser(
    @Param() params: { userId: string },
    @CurrentUser() user: UserPayload,
  ) {
    // Superadmin bypasses team membership check and can access all products
    if (user.role === UserRole.SUPERADMIN) {
      return this.productService.findBy({
        filter: { deleted_at: { $exists: false } },
      });
    }

    try {
      const members = await this.membersService.getTeamMembersByUserId(
        params.userId,
      );

      if (!members || members.length === 0) {
        return [];
      }

      const teamIds = members
        .map((member) => {
          if (typeof member.team === 'string') {
            return member.team;
          } else if (member.team?._id) {
            return member.team._id.toString();
          } else if (Types.ObjectId.isValid(member.team)) {
            return member.team.toString();
          }
          return null;
        })
        .filter((id) => id !== null);
      if (teamIds.length === 0) {
        return [];
      }

      const results = await this.productService.findBy({
        filter: {
          team: { $in: teamIds.map((id) => new Types.ObjectId(id)) },
          deleted_at: { $exists: false },
        },
      });
      return results;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(ERRORS.PRODUCT_FETCH_FAILED, msg);
    }
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

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  async reindexAll() {
    return this.productService.reindexAll();
  }

  /**
   * Get CSV import template
   * Returns a CSV template with example headers and data
   */
  @Get('bulk/template')
  @HttpCode(HttpStatus.OK)
  async getCsvTemplate(@Res() res: Response) {
    try {
      const csvBuffer = this.productService.getCSVTemplate();
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="products-template.csv"',
      });
      res.send(csvBuffer);
    } catch {
      throw new BadRequestException('Failed to generate CSV template');
    }
  }

  /**
   * Bulk import products from CSV file
   * POST /products/bulk/import
   *
   * @param file CSV file to import
   * @param teamId Team ID for products
   * @param skipOnError Skip records with errors (default: false)
   * @returns Import result with success/failure counts
   *
   * @example
   * ```
   * POST /products/bulk/import
   * Content-Type: multipart/form-data
   *
   * file: <csv-file>
   * teamId: "507f1f77bcf86cd799439011"
   * skipOnError: true
   * ```
   */
  @Post('bulk/import')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async bulkImportCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: 'text/csv|text/plain',
            skipMagicNumbersValidation: true, // ← ajoute cette ligne
          }),
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('teamId') teamId: string,
    @Query('skipOnError') skipOnError?: string,
  ) {
    if (!teamId) {
      throw new BadRequestException('teamId query parameter is required');
    }

    try {
      const skip = skipOnError === 'true' || skipOnError === '1';
      return await this.productService.bulkImportFromCSV(
        file.buffer,
        teamId,
        skip,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Bulk import failed: ${(error as any).message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Bulk export products to CSV file
   * GET /products/bulk/export
   *
   * @param teamId Team ID to export
   * @param includeImages Include image URLs (default: false)
   * @param includeDiscounts Include discount info (default: true)
   * @returns CSV file download
   *
   * @example
   * ```
   * GET /products/bulk/export?teamId=507f1f77bcf86cd799439011&includeDiscounts=true
   * ```
   */
  @Get('bulk/export')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkExportCsv(
    @Query('teamId') teamId: string,
    @Query('includeImages') includeImages?: string,
    @Query('includeDiscounts') includeDiscounts?: string,
    @Res() res?: Response,
  ) {
    if (!teamId) {
      throw new BadRequestException('teamId query parameter is required');
    }

    try {
      const csvBuffer = await this.productService.bulkExportToCSV(
        teamId,
        includeImages === 'true' || includeImages === '1',
        includeDiscounts !== 'false' && includeDiscounts !== '0', // Default true
      );

      if (res) {
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="products-${teamId}-${new Date().toISOString().split('T')[0]}.csv"`,
        });
        res.send(csvBuffer);
      }

      return csvBuffer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Bulk export failed: ${(error as any).message || 'Unknown error'}`,
      );
    }
  }
}
