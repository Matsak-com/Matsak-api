import {
  IsArray,
  IsBoolean,
  IsNotEmptyObject,
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

export class CreateFaqDto {
  @ValidateNested()
  @Type(() => FaqTranslationDto)
  @IsNotEmptyObject()
  question: FaqTranslationDto;

  @ValidateNested()
  @Type(() => FaqTranslationDto)
  @IsNotEmptyObject()
  answer: FaqTranslationDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}
