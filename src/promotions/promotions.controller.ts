import {
  Controller,
  Get,
  Post,
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
}
