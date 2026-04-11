import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsMongoId,
  Min,
} from 'class-validator';
import { PricingRuleType } from '../schemas/pricing-rule.schema';

export class CreatePricingRuleDto {
  /** Team scope — omit for a global rule */
  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PricingRuleType, {
    message: `type must be one of: ${Object.values(PricingRuleType).join(', ')}`,
  })
  type: PricingRuleType;

  /** Base price in EUR */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  basePriceEur: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdatePricingRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(PricingRuleType)
  type?: PricingRuleType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  basePriceEur?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
