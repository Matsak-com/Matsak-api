import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { IsMongoId } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/decorator/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import { PromotionsService } from './promotions.service';
import { CreateAdDto, UpdateAdDto, QueryAdDto } from './dto/ad.dto';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  QueryPromotionDto,
  SetPromotionProductsDto,
  SetPromotionCategoriesDto,
  ComputeDiscountDto,
} from './dto/promotion.dto';
import { AdsTrackingThrottlerGuard } from './guards/ads-tracking-throttler.guard';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Multer options shared by create and update endpoints */
const adImageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: (err: Error | null, accept: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException('Only image files are allowed'), false);
    } else {
      cb(null, true);
    }
  },
};

// ─── Param DTO ────────────────────────────────────────────────────────────────
class IdParamDto {
  @IsMongoId()
  id: string;
}

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // ══════════════════════════════════════════════════════════
  // ADS
  // ══════════════════════════════════════════════════════════

  @Get('ads')
  @Public()
  listAds(@Query() query: QueryAdDto) {
    return this.promotionsService.findAllAds(query);
  }

  @Post('ads')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('image', adImageMulterOptions))
  createAd(
    @Body() dto: CreateAdDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.promotionsService.createAd(dto, file);
  }

  @Patch('ads/:id')
  @Roles(UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('image', adImageMulterOptions))
  updateAd(
    @Param() params: IdParamDto,
    @Body() dto: UpdateAdDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.promotionsService.updateAd(params.id, dto, file);
  }

  @Delete('ads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPERADMIN)
  deleteAd(@Param() params: IdParamDto) {
    return this.promotionsService.deleteAd(params.id);
  }

  @Post('ads/:id/impression')
  @Public()
  @UseGuards(AdsTrackingThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 3600 } })
  @HttpCode(HttpStatus.OK)
  trackImpression(@Param() params: IdParamDto) {
    return this.promotionsService.trackImpression(params.id);
  }

  @Post('ads/:id/click')
  @Public()
  @UseGuards(AdsTrackingThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 3600 } })
  @HttpCode(HttpStatus.OK)
  trackClick(@Param() params: IdParamDto) {
    return this.promotionsService.trackClick(params.id);
  }

  // ══════════════════════════════════════════════════════════
  // PROMOTIONS
  // ══════════════════════════════════════════════════════════

  @Get()
  @Public()
  listPromotions(@Query() query: QueryPromotionDto) {
    return this.promotionsService.findAllPromotions(query);
  }

  /** GET /promotions/applicable?productIds[]=...&categoryIds[]=... */
  @Get('applicable')
  @Public()
  findApplicable(
    @Query('productIds') productIds: string | string[] = [],
    @Query('categoryIds') categoryIds: string | string[] = [],
  ) {
    const pIds = Array.isArray(productIds) ? productIds : [productIds].filter(Boolean);
    const cIds = Array.isArray(categoryIds) ? categoryIds : [categoryIds].filter(Boolean);
    return this.promotionsService.findApplicableForProducts(pIds, cIds);
  }

  /** POST /promotions/compute-discount — preview discount before payment */
  @Post('compute-discount')
  @Public()
  @HttpCode(HttpStatus.OK)
  computeDiscount(@Body() dto: ComputeDiscountDto) {
    return this.promotionsService.computeCartDiscount({
      promotionId: dto.promotionId,
      cartItems: dto.productIds.map((id) => ({
        productId: id,
        priceEur: 0,
        quantity: 1,
      })),
      subtotalEur: dto.subtotalEur,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('image', adImageMulterOptions))
  createPromotion(
    @Body() dto: CreatePromotionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.promotionsService.createPromotion(dto, file);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('image', adImageMulterOptions))
  updatePromotion(
    @Param() params: IdParamDto,
    @Body() dto: UpdatePromotionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.promotionsService.updatePromotion(params.id, dto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPERADMIN)
  deletePromotion(@Param() params: IdParamDto) {
    return this.promotionsService.deletePromotion(params.id);
  }

  // ── Product / Category associations ──────────────────────────────────────

  /** PUT /promotions/:id/products — set applicable product IDs (scope becomes PRODUCTS) */
  @Put(':id/products')
  @Roles(UserRole.SUPERADMIN)
  setProducts(
    @Param() params: IdParamDto,
    @Body() dto: SetPromotionProductsDto,
  ) {
    return this.promotionsService.setPromotionProducts(params.id, dto.productIds);
  }

  /** PUT /promotions/:id/categories — set applicable category IDs (scope becomes CATEGORIES) */
  @Put(':id/categories')
  @Roles(UserRole.SUPERADMIN)
  setCategories(
    @Param() params: IdParamDto,
    @Body() dto: SetPromotionCategoriesDto,
  ) {
    return this.promotionsService.setPromotionCategories(params.id, dto.categoryIds);
  }

  /** DELETE /promotions/:id/scope — reset to scope ALL (applies to everything) */
  @Delete(':id/scope')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPERADMIN)
  clearScope(@Param() params: IdParamDto) {
    return this.promotionsService.clearPromotionScope(params.id);
  }
}
