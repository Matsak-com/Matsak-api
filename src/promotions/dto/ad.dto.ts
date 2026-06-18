import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsMongoId,
  IsUrl,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AdPlacement, AdStatus, AdType } from '../enums';

/** Coerce empty string → undefined so @IsOptional + @IsUrl pass when the field
 *  is not supplied via multipart/form-data (browsers send every unset text
 *  field as an empty string). */
const EmptyToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

const URL_OPTIONS = {
  protocols: ['http', 'https'] as any,
  require_protocol: true,
  require_tld: false,
};

export class CreateAdDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUrl(URL_OPTIONS)
  imageUrl?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUrl(URL_OPTIONS)
  targetUrl?: string;

  @IsEnum(AdPlacement, {
    message: `placement must be one of: ${Object.values(AdPlacement).join(', ')}`,
  })
  placement: AdPlacement;

  @IsEnum(AdType, {
    message: `type must be one of: ${Object.values(AdType).join(', ')}`,
  })
  type: AdType;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(AdStatus, {
    message: `status must be one of: ${Object.values(AdStatus).join(', ')}`,
  })
  status?: AdStatus;

  @IsOptional()
  @EmptyToUndefined()
  @IsNumber()
  @Min(1)
  priority?: number;

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
  @IsMongoId()
  teamId?: string;
}

export class UpdateAdDto {
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
  @IsUrl(URL_OPTIONS)
  imageUrl?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUrl(URL_OPTIONS)
  targetUrl?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(AdPlacement, {
    message: `placement must be one of: ${Object.values(AdPlacement).join(', ')}`,
  })
  placement?: AdPlacement;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(AdType, {
    message: `type must be one of: ${Object.values(AdType).join(', ')}`,
  })
  type?: AdType;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(AdStatus, {
    message: `status must be one of: ${Object.values(AdStatus).join(', ')}`,
  })
  status?: AdStatus;

  @IsOptional()
  @EmptyToUndefined()
  @IsNumber()
  @Min(1)
  priority?: number;

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
  @IsMongoId()
  teamId?: string;
}

export class QueryAdDto {
  @IsOptional()
  @IsEnum(AdStatus, {
    message: `status must be one of: ${Object.values(AdStatus).join(', ')}`,
  })
  status?: AdStatus;

  @IsOptional()
  @IsEnum(AdPlacement, {
    message: `placement must be one of: ${Object.values(AdPlacement).join(', ')}`,
  })
  placement?: AdPlacement;

  @IsOptional()
  @IsMongoId()
  teamId?: string;
}
