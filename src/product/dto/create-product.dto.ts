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

  // Parse detailData JSON string
  if (typeof cloned.detailData === 'string') {
    try {
      cloned.detailData = JSON.parse(cloned.detailData);
    } catch {
      // leave as-is; validation will catch it
    }
  }

  // Handle team from detailData
  if (cloned.detailData?.team) {
    cloned.teamId = cloned.detailData.team;
    delete cloned.detailData.team;
  }

  // Map categoryId to detailData.categoryId
  if (cloned.categoryId) {
    cloned.detailData = cloned.detailData || {};
    cloned.detailData.categoryId = cloned.categoryId;
    delete cloned.categoryId;
  }

  // Handle subcategory mapping (optional)
  if (cloned.subcategoryId) {
    cloned.detailData = cloned.detailData || {};
    cloned.detailData.subcategoryId = cloned.subcategoryId;
    delete cloned.subcategoryId;
  }

  // Handle pricing and discount data
  if (cloned.price) {
    cloned.basePrice = parseFloat(cloned.price);
    delete cloned.price;
  }

  // Handle discount information
  if (cloned.discountType && cloned.discountType !== 'no-discount') {
    const discountValue = parseFloat(cloned.discountValue || '0');
    if (discountValue > 0) {
      // Map discount types to valid enum values
      let mappedType = cloned.discountType;
      if (cloned.discountType === 'percent') {
        mappedType = 'percentage';
      } else if (!['percentage', 'fixed', 'bulk'].includes(cloned.discountType)) {
        mappedType = 'fixed'; // Default fallback
      }
      
      cloned.discounts = [{
        type: mappedType,
        value: discountValue,
        isActive: true,
      }];
    }
  }
  
  // Clean up discount fields
  delete cloned.discountType;
  delete cloned.discountValue;

  // Handle dates in detailData
  if (cloned.detailData?.expirationDate) {
    cloned.detailData.expirationDate = new Date(cloned.detailData.expirationDate);
  }

  // Handle boolean fields
  if (typeof cloned.isActive === 'string') {
    cloned.isActive = cloned.isActive === 'true';
  }

  if (typeof cloned.detailData.isRepackaged === 'string') {
    cloned.detailData.isRepackaged = cloned.detailData.isRepackaged === 'true';
  }

  // Clean up empty strings in optional fields
  if (cloned.detailData) {
    Object.keys(cloned.detailData).forEach(key => {
      if (cloned.detailData[key] === '' && key !== 'name' && key !== 'description') {
        cloned.detailData[key] = undefined;
      }
    });
  }

  return cloned;
}, _createProductSchema);

export const simpleUpdateMultipartSchema = z.preprocess((raw) => {
  if (typeof raw !== 'object' || raw === null) return raw;
  const cloned: any = { ...(raw as Record<string, any>) };

  // Parse detailData JSON string
  if (cloned.detailData && typeof cloned.detailData === 'string') {
    try {
      cloned.detailData = JSON.parse(cloned.detailData);
    } catch {
      // leave as-is; validation will catch it
    }
  }

  // Handle dates in detailData
  if (cloned.detailData?.expirationDate) {
    if (typeof cloned.detailData.expirationDate === 'string') {
      cloned.detailData.expirationDate = new Date(
        cloned.detailData.expirationDate,
      );
    }
  }

  // Handle team from detailData OR from top level
  if (cloned.detailData?.team) {
    cloned.teamId = cloned.detailData.team;
    delete cloned.detailData.team;
  } else if (cloned.teamId) {
    // teamId is already at the right level, keep it
  }

  // Handle category and subcategory mapping
  if (cloned.categoryId) {
    cloned.detailData = cloned.detailData || {};
    cloned.detailData.categoryId = cloned.categoryId;
    delete cloned.categoryId;
  }

  if (cloned.subcategoryId) {
    cloned.detailData = cloned.detailData || {};
    cloned.detailData.subcategoryId = cloned.subcategoryId;
    delete cloned.subcategoryId;
  }

  // Handle pricing
  if (cloned.price) {
    cloned.basePrice = parseFloat(cloned.price);
    delete cloned.price;
  }

  // Handle currency
  if (cloned.currency) {
    // Keep currency at product level
  }

  // Handle discount information
  if (cloned.discountType && cloned.discountType !== 'no-discount') {
    const discountValue = parseFloat(cloned.discountValue || '0');
    if (discountValue > 0) {
      // Map discount types to valid enum values
      let mappedType = cloned.discountType;
      if (cloned.discountType === 'percent') {
        mappedType = 'percentage';
      } else if (
        !['percentage', 'fixed', 'bulk'].includes(cloned.discountType)
      ) {
        mappedType = 'fixed'; // Default fallback
      }

      cloned.discounts = [
        {
          type: mappedType,
          value: discountValue,
          isActive: true,
        },
      ];
    }
  }

  delete cloned.discountType;
  delete cloned.discountValue;

  // Handle productImage object (with data, name, mimeType, altText, url structure)
  if (cloned.hasOwnProperty('productImage')) {
    if (cloned.productImage === null || cloned.productImage === 'null') {
      // Explicit image removal
      cloned.imageData = null;
    } else if (cloned.productImage) {
      if (typeof cloned.productImage === 'string') {
        try {
          cloned.productImage = JSON.parse(cloned.productImage);
        } catch {
          // leave as-is
        }
      }

      if (cloned.productImage && typeof cloned.productImage === 'object') {
        // Map productImage structure to imageData
        cloned.imageData = {
          altText: cloned.productImage.altText || '',
          // If it has base64 data, we'll handle it in the service
          data: cloned.productImage.data,
          name: cloned.productImage.name,
          mimeType: cloned.productImage.mimeType,
          url: cloned.productImage.url,
        };
      }
    }
    delete cloned.productImage;
  }

  // Handle booleans
  if (typeof cloned.isActive === 'string') {
    cloned.isActive = cloned.isActive === 'true';
  }

  if (cloned.detailData && typeof cloned.detailData.isRepackaged === 'string') {
    cloned.detailData.isRepackaged = cloned.detailData.isRepackaged === 'true';
  }

  // Clean up empty strings in optional fields
  if (cloned.detailData) {
    Object.keys(cloned.detailData).forEach((key) => {
      if (
        cloned.detailData[key] === '' &&
        key !== 'name' &&
        key !== 'description'
      ) {
        cloned.detailData[key] = undefined;
      }
    });
  }

  return cloned;
}, _simpleUpdateSchema);
