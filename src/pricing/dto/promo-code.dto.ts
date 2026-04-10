import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsMongoId,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { DiscountType } from '../schemas/promo-code.schema';

export class CreatePromoCodeDto {
  /** Code, 3–30 alphanumeric, dash or underscore */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{3,30}$/, {
    message: 'code must be 3–30 alphanumeric characters, dashes or underscores',
  })
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsEnum(DiscountType, {
    message: `discountType must be one of: ${Object.values(DiscountType).join(', ')}`,
  })
  discountType: DiscountType;

  /** % (0–100) for PERCENTAGE, EUR amount for FIXED_EUR */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  minOrderAmountEur?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromoCodeDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,30}$/, {
    message: 'code must be 3–30 alphanumeric characters, dashes or underscores',
  })
  code?: string;

  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  minOrderAmountEur?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  /** Order subtotal in EUR (products only, before surcharges) */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  orderSubtotalEur: number;

  @IsOptional()
  @IsMongoId()
  teamId?: string;
}
