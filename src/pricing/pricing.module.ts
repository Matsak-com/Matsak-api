import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingRuleRepository } from './pricing-rule.repository';
import { PromoCodeRepository } from './promo-code.repository';
import { PricingRule, PricingRuleSchema } from './schemas/pricing-rule.schema';
import { PromoCode, PromoCodeSchema } from './schemas/promo-code.schema';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PricingRule.name, schema: PricingRuleSchema },
      { name: PromoCode.name, schema: PromoCodeSchema },
    ]),
    CurrencyModule,
  ],
  controllers: [PricingController],
  providers: [PricingService, PricingRuleRepository, PromoCodeRepository],
  exports: [PricingService],
})
export class PricingModule {}
