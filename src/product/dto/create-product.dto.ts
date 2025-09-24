import {
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDetailProductDto } from '../../detail-product/dto/create-detail-product.dto';
import { CreateImageProductDto } from '../../image-product/dto/create-image-product.dto';
import { DiscountDto } from '../dto/pricing.dto';
import { z } from 'zod';
import {
  createProductSchema as _createProductSchema,
  simpleUpdateSchema as _simpleUpdateSchema,
} from '../../common/schemas/product.schemas';

export class CreateProductDto {
  @ValidateNested()
  @Type(() => CreateDetailProductDto)
  detailData: CreateDetailProductDto;

  @ValidateNested()
  @Type(() => CreateImageProductDto)
  imageData?: CreateImageProductDto;
  @IsMongoId()
  teamId: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DiscountDto)
  discounts?: DiscountDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  altText: string;
}

// Preprocess schemas for multipart/form-data bodies (parse JSON strings, coerce dates/bools)
export const createProductMultipartSchema = z.preprocess((raw) => {
  if (typeof raw !== 'object' || raw === null) return raw;
  const cloned: any = { ...(raw as Record<string, any>) };

  if (typeof cloned.detailData === 'string') {
    try {
      cloned.detailData = JSON.parse(cloned.detailData);
    } catch {
      // leave as-is; validation will catch it
    }
  }

  if (cloned.discounts) {
    try {
      const parsed =
        typeof cloned.discounts === 'string'
          ? JSON.parse(cloned.discounts)
          : cloned.discounts;
      if (Array.isArray(parsed)) {
        cloned.discounts = parsed.map((d: any) => ({
          ...d,
          startDate: d.startDate ? new Date(d.startDate) : undefined,
          endDate: d.endDate ? new Date(d.endDate) : undefined,
        }));
      }
    } catch {
      // ignore parse errors; validation will handle issues
    }
  }

  if (cloned.isActive === 'true' || cloned.isActive === 'false') {
    cloned.isActive = cloned.isActive === 'true';
  }

  return cloned;
}, _createProductSchema);

export const simpleUpdateMultipartSchema = z.preprocess((raw) => {
  if (typeof raw !== 'object' || raw === null) return raw;
  const cloned: any = { ...(raw as Record<string, any>) };

  if (cloned.detailData && typeof cloned.detailData === 'string') {
    try {
      cloned.detailData = JSON.parse(cloned.detailData);
    } catch {
      // leave as-is; validation will catch it
    }
    if (
      cloned.detailData?.expirationDate &&
      typeof cloned.detailData.expirationDate === 'string'
    ) {
      cloned.detailData.expirationDate = new Date(
        cloned.detailData.expirationDate,
      );
    }
  }

  if (cloned.discounts) {
    try {
      const parsed =
        typeof cloned.discounts === 'string'
          ? JSON.parse(cloned.discounts)
          : cloned.discounts;
      if (Array.isArray(parsed)) {
        cloned.discounts = parsed.map((d: any) => ({
          ...d,
          startDate: d.startDate ? new Date(d.startDate) : undefined,
          endDate: d.endDate ? new Date(d.endDate) : undefined,
        }));
      }
    } catch {
      // ignore parse errors
    }
  }

  if (cloned.isActive === 'true' || cloned.isActive === 'false') {
    cloned.isActive = cloned.isActive === 'true';
  }

  return cloned;
}, _simpleUpdateSchema);
