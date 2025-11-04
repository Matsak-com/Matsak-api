import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryTranslationDto {
  @IsString()
  @IsOptional()
  en?: string;

  @IsString()
  @IsOptional()
  fr?: string;

  @IsString()
  @IsOptional()
  ar?: string;

  @IsString()
  @IsOptional()
  zh?: string;
}

export class CategoryTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryTranslationDto)
  name?: CategoryTranslationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryTranslationDto)
  description?: CategoryTranslationDto;
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryTranslationsDto)
  translations?: CategoryTranslationsDto;

  @IsOptional()
  imageUrl?: Express.Multer.File;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
