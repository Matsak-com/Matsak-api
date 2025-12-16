import {
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryTranslationsDto } from './create-category.dto';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryTranslationsDto)
  translations?: CategoryTranslationsDto;

  @IsOptional()
  imageUrl?: Express.Multer.File;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
