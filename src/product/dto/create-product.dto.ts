import {
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsMongoId,
  IsString,
  IsNumber,
  Min,
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

// DTO for advanced data
export class AdvanceDataDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };

  @IsOptional()
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
  };

  @IsOptional()
  @IsString()
  additionalInfo?: string;
}

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
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  productImage?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  subcategoryId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdvanceDataDto)
  advanceData?: AdvanceDataDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DiscountDto)
  discounts?: DiscountDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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
    // If team is an object (populated), extract _id
    if (
      typeof cloned.detailData.team === 'object' &&
      cloned.detailData.team !== null
    ) {
      cloned.teamId = cloned.detailData.team._id || cloned.detailData.team;
    } else {
      cloned.teamId = cloned.detailData.team;
    }
    delete cloned.detailData.team;
  } else if (
    cloned.teamId &&
    typeof cloned.teamId === 'object' &&
    cloned.teamId !== null
  ) {
    // If teamId is sent as a populated team object at top level, extract _id
    cloned.teamId = cloned.teamId._id || cloned.teamId;
  }

  // Handle category from detailData.category OR top level categoryId
  if (cloned.detailData?.category) {
    cloned.detailData = cloned.detailData || {};
    // If category is an object (populated), extract _id
    if (
      typeof cloned.detailData.category === 'object' &&
      cloned.detailData.category !== null
    ) {
      cloned.detailData.categoryId =
        cloned.detailData.category._id || cloned.detailData.category;
      cloned.categoryId =
        cloned.detailData.category._id || cloned.detailData.category;
    } else {
      cloned.detailData.categoryId = cloned.detailData.category;
      cloned.categoryId = cloned.detailData.category;
    }
    delete cloned.detailData.category;
  } else if (cloned.categoryId) {
    cloned.detailData = cloned.detailData || {};
    // If categoryId is an object (populated category), extract _id
    if (typeof cloned.categoryId === 'object' && cloned.categoryId !== null) {
      cloned.detailData.categoryId = cloned.categoryId._id || cloned.categoryId;
      cloned.categoryId = cloned.categoryId._id || cloned.categoryId;
    } else {
      cloned.detailData.categoryId = cloned.categoryId;
    }
    // Don't delete categoryId here - keep it for validation
  }

  // Handle subcategory mapping (optional)
  if (cloned.subcategoryId) {
    cloned.detailData = cloned.detailData || {};
    // If subcategory is an object (populated), extract _id
    if (
      typeof cloned.subcategoryId === 'object' &&
      cloned.subcategoryId !== null
    ) {
      cloned.detailData.subcategoryId =
        cloned.subcategoryId._id || cloned.subcategoryId;
    } else {
      cloned.detailData.subcategoryId = cloned.subcategoryId;
    }
  }
  // Clean up subcategoryId whether it's null or not
  delete cloned.subcategoryId;

  // Clean up MongoDB-specific fields that shouldn't be in creation
  if (cloned.detailData) {
    delete cloned.detailData._id;
    delete cloned.detailData.createdAt;
    delete cloned.detailData.updatedAt;
    delete cloned.detailData.__v;
  }

  // Normalize any remaining populated ObjectId references passed directly in detailData
  if (cloned.detailData) {
    if (
      typeof cloned.detailData.categoryId === 'object' &&
      cloned.detailData.categoryId !== null
    ) {
      cloned.detailData.categoryId =
        cloned.detailData.categoryId._id || cloned.detailData.categoryId;
      cloned.categoryId = cloned.detailData.categoryId;
    }
    if (
      typeof cloned.detailData.subcategoryId === 'object' &&
      cloned.detailData.subcategoryId !== null
    ) {
      cloned.detailData.subcategoryId =
        cloned.detailData.subcategoryId._id || cloned.detailData.subcategoryId;
    }
  }

  // Handle pricing and discount data
  if (cloned.price) {
    cloned.basePrice =
      typeof cloned.price === 'string'
        ? parseFloat(cloned.price)
        : cloned.price;
    delete cloned.price;
  }

  // Handle basePrice conversion from string to number
  if (cloned.basePrice && typeof cloned.basePrice === 'string') {
    cloned.basePrice = parseFloat(cloned.basePrice);
  }

  // Handle discount information
  if (cloned.discountType && cloned.discountType !== 'no-discount') {
    const discountValue =
      typeof cloned.discountValue === 'string'
        ? parseFloat(cloned.discountValue || '0')
        : cloned.discountValue || 0;
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

  // Clean up discount fields
  delete cloned.discountType;
  delete cloned.discountValue;

  // Handle advanceData
  if (cloned.advanceData) {
    if (typeof cloned.advanceData === 'string') {
      try {
        cloned.advanceData = JSON.parse(cloned.advanceData);
      } catch {
        // leave as-is; validation will catch it
      }
    }

    // Merge advanceData fields into detailData where they belong
    if (cloned.advanceData && typeof cloned.advanceData === 'object') {
      cloned.detailData = cloned.detailData || {};
      if (cloned.advanceData.sku !== undefined) {
        cloned.detailData.sku = cloned.advanceData.sku;
      }
      if (cloned.advanceData.barcode !== undefined) {
        cloned.detailData.barcode = cloned.advanceData.barcode;
      }
      if (cloned.advanceData.weight !== undefined) {
        cloned.detailData.weight = cloned.advanceData.weight;
      }
      if (cloned.advanceData.dimensions !== undefined) {
        cloned.detailData.dimensions = cloned.advanceData.dimensions;
      }
      if (cloned.advanceData.seo !== undefined) {
        cloned.detailData.seo = cloned.advanceData.seo;
      }
      if (cloned.advanceData.additionalInfo !== undefined) {
        cloned.detailData.additionalInfo = cloned.advanceData.additionalInfo;
      }
    }
  }

  // Handle dates in detailData
  if (cloned.detailData?.expirationDate) {
    cloned.detailData.expirationDate = new Date(
      cloned.detailData.expirationDate,
    );
  }

  // Handle boolean fields
  if (typeof cloned.isActive === 'string') {
    cloned.isActive = cloned.isActive === 'true';
  }

  if (typeof cloned.detailData?.isRepackaged === 'string') {
    cloned.detailData.isRepackaged = cloned.detailData.isRepackaged === 'true';
  }

  // Clean up empty strings in optional fields
  if (cloned.detailData) {
    Object.keys(cloned.detailData).forEach((key) => {
      if (
        cloned.detailData[key] === '' &&
        key !== 'name' // Only name is required, keep it as string even if empty
      ) {
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
    // If team is an object (populated), extract _id
    if (
      typeof cloned.detailData.team === 'object' &&
      cloned.detailData.team !== null
    ) {
      cloned.teamId = cloned.detailData.team._id || cloned.detailData.team;
    } else {
      cloned.teamId = cloned.detailData.team;
    }
    delete cloned.detailData.team;
  } else if (cloned.teamId) {
    // If teamId is a populated team object, extract _id
    if (typeof cloned.teamId === 'object' && cloned.teamId !== null) {
      cloned.teamId = cloned.teamId._id || cloned.teamId;
    }
  }

  // Handle category from detailData.category OR top level categoryId
  if (cloned.detailData?.category) {
    cloned.detailData = cloned.detailData || {};
    // If category is an object (populated), extract _id
    if (
      typeof cloned.detailData.category === 'object' &&
      cloned.detailData.category !== null
    ) {
      cloned.detailData.categoryId =
        cloned.detailData.category._id || cloned.detailData.category;
      cloned.categoryId =
        cloned.detailData.category._id || cloned.detailData.category;
    } else {
      cloned.detailData.categoryId = cloned.detailData.category;
      cloned.categoryId = cloned.detailData.category;
    }
    delete cloned.detailData.category;
  } else if (cloned.categoryId) {
    cloned.detailData = cloned.detailData || {};
    // If categoryId is an object (populated category), extract _id
    if (typeof cloned.categoryId === 'object' && cloned.categoryId !== null) {
      cloned.detailData.categoryId = cloned.categoryId._id || cloned.categoryId;
      cloned.categoryId = cloned.categoryId._id || cloned.categoryId;
    } else {
      cloned.detailData.categoryId = cloned.categoryId;
    }
  }

  // Handle subcategory
  if (
    cloned.detailData?.subcategory &&
    cloned.detailData.subcategory !== null
  ) {
    // If subcategory is an object (populated), extract _id
    if (
      typeof cloned.detailData.subcategory === 'object' &&
      cloned.detailData.subcategory !== null
    ) {
      cloned.detailData.subcategoryId =
        cloned.detailData.subcategory._id || cloned.detailData.subcategory;
      cloned.subcategoryId =
        cloned.detailData.subcategory._id || cloned.detailData.subcategory;
    } else {
      cloned.detailData.subcategoryId = cloned.detailData.subcategory;
      cloned.subcategoryId = cloned.detailData.subcategory;
    }
    delete cloned.detailData.subcategory;
  } else if (cloned.subcategoryId) {
    cloned.detailData = cloned.detailData || {};
    // If subcategoryId is a populated object, extract _id
    if (
      typeof cloned.subcategoryId === 'object' &&
      cloned.subcategoryId !== null
    ) {
      cloned.detailData.subcategoryId =
        cloned.subcategoryId._id || cloned.subcategoryId;
    } else {
      cloned.detailData.subcategoryId = cloned.subcategoryId;
    }
  }
  // Clean up subcategory and subcategoryId if they're null
  if (cloned.detailData?.subcategory === null) {
    delete cloned.detailData.subcategory;
  }
  delete cloned.subcategoryId;

  // Clean up MongoDB-specific fields that shouldn't be in updates
  if (cloned.detailData) {
    delete cloned.detailData._id;
    delete cloned.detailData.createdAt;
    delete cloned.detailData.updatedAt;
    delete cloned.detailData.__v;
  }

  // Normalize any remaining populated ObjectId references passed directly in detailData
  if (cloned.detailData) {
    if (
      typeof cloned.detailData.categoryId === 'object' &&
      cloned.detailData.categoryId !== null
    ) {
      cloned.detailData.categoryId =
        cloned.detailData.categoryId._id || cloned.detailData.categoryId;
      cloned.categoryId = cloned.detailData.categoryId;
    }
    if (
      typeof cloned.detailData.subcategoryId === 'object' &&
      cloned.detailData.subcategoryId !== null
    ) {
      cloned.detailData.subcategoryId =
        cloned.detailData.subcategoryId._id || cloned.detailData.subcategoryId;
    }
  }

  // Handle pricing
  if (cloned.price) {
    cloned.basePrice =
      typeof cloned.price === 'string'
        ? parseFloat(cloned.price)
        : cloned.price;
    delete cloned.price;
  }

  // Handle basePrice conversion from string to number
  if (cloned.basePrice && typeof cloned.basePrice === 'string') {
    cloned.basePrice = parseFloat(cloned.basePrice);
  }

  // Handle currency
  if (cloned.currency) {
    // Keep currency at product level
  }

  // Handle discount information
  if (cloned.discountType && cloned.discountType !== 'no-discount') {
    const discountValue =
      typeof cloned.discountValue === 'string'
        ? parseFloat(cloned.discountValue || '0')
        : cloned.discountValue || 0;
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

  // Handle discounts array from payload
  if (cloned.discounts) {
    if (typeof cloned.discounts === 'string') {
      try {
        cloned.discounts = JSON.parse(cloned.discounts);
      } catch {
        // If parsing fails, set to empty array
        cloned.discounts = [];
      }
    }
    // Ensure it's an array
    if (!Array.isArray(cloned.discounts)) {
      cloned.discounts = [];
    }
  }

  // Handle existingImages array from payload (for image merge functionality)
  if (cloned.existingImages) {
    if (typeof cloned.existingImages === 'string') {
      try {
        cloned.existingImages = JSON.parse(cloned.existingImages);
      } catch {
        // If parsing fails, set to empty array
        cloned.existingImages = [];
      }
    }
    // Ensure it's an array
    if (!Array.isArray(cloned.existingImages)) {
      cloned.existingImages = [];
    }
  }

  // Handle advanceData for updates
  if (cloned.advanceData) {
    if (typeof cloned.advanceData === 'string') {
      try {
        cloned.advanceData = JSON.parse(cloned.advanceData);
      } catch {
        // leave as-is; validation will catch it
      }
    }

    // Merge advanceData fields into detailData where they belong
    if (cloned.advanceData && typeof cloned.advanceData === 'object') {
      cloned.detailData = cloned.detailData || {};

      // Map advance data fields to detailData
      if (cloned.advanceData.sku !== undefined) {
        cloned.detailData.sku = cloned.advanceData.sku;
      }
      if (cloned.advanceData.barcode !== undefined) {
        cloned.detailData.barcode = cloned.advanceData.barcode;
      }
      if (cloned.advanceData.weight !== undefined) {
        cloned.detailData.weight = cloned.advanceData.weight;
      }
      if (cloned.advanceData.dimensions !== undefined) {
        cloned.detailData.dimensions = cloned.advanceData.dimensions;
      }
      if (cloned.advanceData.seo !== undefined) {
        cloned.detailData.seo = cloned.advanceData.seo;
      }
      if (cloned.advanceData.additionalInfo !== undefined) {
        cloned.detailData.additionalInfo = cloned.advanceData.additionalInfo;
      }
    }
  }

  // Handle productImage object (with data, name, mimeType, url structure)
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
