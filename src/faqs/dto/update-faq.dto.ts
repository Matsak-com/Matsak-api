import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FaqTranslationDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  fr?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  en?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  ar?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  zh?: string;
}

export class UpdateFaqDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => FaqTranslationDto)
  question?: FaqTranslationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FaqTranslationDto)
  answer?: FaqTranslationDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}
