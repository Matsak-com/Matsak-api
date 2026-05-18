import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { AdRepository } from './ad.repository';
import { PromotionRepository } from './promotion.repository';
import { AdImageService } from './ad-image.service';
import { Ad, AdSchema } from './schemas/ad.schema';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ad.name, schema: AdSchema },
      { name: Promotion.name, schema: PromotionSchema },
    ]),
  ],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    AdRepository,
    PromotionRepository,
    AdImageService,
  ],
  exports: [PromotionsService],
})
export class PromotionsModule {}
