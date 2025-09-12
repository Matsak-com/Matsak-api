import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDetailProductDto } from '../../detail-product/dto/create-detail-product.dto';
import { CreateImageProductDto } from '../../image-product/dto/create-image-product.dto';

export class CreateProductDto {
  @ValidateNested()
  @Type(() => CreateDetailProductDto)
  detailData: CreateDetailProductDto;

  @ValidateNested()
  @Type(() => CreateImageProductDto)
  imageData: CreateImageProductDto;

  @IsMongoId()
  subcategoryId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  altText: string;
}

