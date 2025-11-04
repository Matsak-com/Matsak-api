import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class SubCategoryTranslationDto {
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

export class SubCategoryTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SubCategoryTranslationDto)
  name?: SubCategoryTranslationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SubCategoryTranslationDto)
  description?: SubCategoryTranslationDto;
}

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsMongoId()
  @IsNotEmpty()
  categoryId: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  parentId?: Types.ObjectId;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SubCategoryTranslationsDto)
  translations?: SubCategoryTranslationsDto;

  @IsOptional()
  imageUrl?: Express.Multer.File;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
