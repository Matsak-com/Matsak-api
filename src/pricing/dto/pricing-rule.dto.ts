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
  Max,
  ValidateIf,
} from 'class-validator';
import { PricingRuleType, PricingRuleBaseType } from '../schemas/pricing-rule.schema';

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

  /**
   * Determines how the surcharge is calculated.
   * FIXED (default): uses basePriceEur as a fixed EUR amount.
   * PERCENTAGE: uses basePercentage % of the invoice subtotal.
   */
  @IsOptional()
  @IsEnum(PricingRuleBaseType, {
    message: `baseType must be one of: ${Object.values(PricingRuleBaseType).join(', ')}`,
  })
  baseType?: PricingRuleBaseType;

  /**
   * Fixed surcharge in EUR. Required when baseType is FIXED (or omitted).
   */
  @ValidateIf((o) => o.baseType !== PricingRuleBaseType.PERCENTAGE)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  basePriceEur?: number;

  /**
   * Surcharge as a percentage of the cart subtotal (0–100).
   * Required when baseType is PERCENTAGE.
   */
  @ValidateIf((o) => o.baseType === PricingRuleBaseType.PERCENTAGE)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  basePercentage?: number;

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
  @IsEnum(PricingRuleBaseType, {
    message: `baseType must be one of: ${Object.values(PricingRuleBaseType).join(', ')}`,
  })
  baseType?: PricingRuleBaseType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  basePriceEur?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  basePercentage?: number;

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
