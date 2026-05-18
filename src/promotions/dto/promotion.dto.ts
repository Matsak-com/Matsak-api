import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsUrl,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DiscountType, PromotionStatus, PromotionType } from '../enums';

/** Coerce empty string → undefined so multipart/form-data unset fields pass
 *  @IsOptional() without triggering format validators. */
const EmptyToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

const URL_OPTIONS = {
  protocols: ['http', 'https'] as any,
  require_protocol: true,
  require_tld: false,
};

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PromotionType, {
    message: `type must be one of: ${Object.values(PromotionType).join(', ')}`,
  })
  type: PromotionType;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(PromotionStatus, {
    message: `status must be one of: ${Object.values(PromotionStatus).join(', ')}`,
  })
  status?: PromotionStatus;

  @IsOptional()
  @EmptyToUndefined()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(DiscountType, {
    message: `discountType must be one of: ${Object.values(DiscountType).join(', ')}`,
  })
  discountType?: DiscountType;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUrl(URL_OPTIONS)
  targetUrl?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsBoolean()
  featured?: boolean;
}

export class UpdatePromotionDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(PromotionType, {
    message: `type must be one of: ${Object.values(PromotionType).join(', ')}`,
  })
  type?: PromotionType;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(PromotionStatus, {
    message: `status must be one of: ${Object.values(PromotionStatus).join(', ')}`,
  })
  status?: PromotionStatus;

  @IsOptional()
  @EmptyToUndefined()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(DiscountType, {
    message: `discountType must be one of: ${Object.values(DiscountType).join(', ')}`,
  })
  discountType?: DiscountType;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUrl(URL_OPTIONS)
  targetUrl?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsBoolean()
  featured?: boolean;
}

export class QueryPromotionDto {
  @IsOptional()
  @IsEnum(PromotionStatus, {
    message: `status must be one of: ${Object.values(PromotionStatus).join(', ')}`,
  })
  status?: PromotionStatus;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsEnum(PromotionType, {
    message: `type must be one of: ${Object.values(PromotionType).join(', ')}`,
  })
  type?: PromotionType;

  @IsOptional()
  @IsMongoId()
  teamId?: string;
}
