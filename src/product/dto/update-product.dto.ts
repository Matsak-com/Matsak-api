import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsMongoId,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { CreateDetailProductDto } from 'src/detail-product/dto/create-detail-product.dto';
import { UpdateImageProductDto } from 'src/image-product/dto/update-image-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDetailProductDto)
  detailData?: CreateDetailProductDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateImageProductDto)
  imageData?: UpdateImageProductDto;

  @IsOptional()
  @IsMongoId()
  subcategoryId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
