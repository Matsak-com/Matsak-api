import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsMongoId()
  detail: Types.ObjectId;

  @IsMongoId()
  subcategory: Types.ObjectId;

  @IsMongoId()
  team: Types.ObjectId;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  images?: Types.ObjectId[];
}
