import { UpdateDetailProductDto } from '../../detail-product/dto/update-detail-product.dto';
import { DiscountDto } from './pricing.dto';

// DTO for advanced data (for updates)
export class AdvanceDataUpdateDto {
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  additionalInfo?: string;
}

export class UpdateProductDto {
  detailData?: UpdateDetailProductDto;
  isPublished?: boolean;
  basePrice?: number;
  price?: number;
  currency?: string;
  teamId?: string;
  discountType?: string;
  discountValue?: number;
  productImage?: string | null; // Allow null for image removal
  categoryId?: string;
  subcategoryId?: string;
  advanceData?: AdvanceDataUpdateDto;
  discounts?: DiscountDto[];
  existingImages?: string[]; // Array of image names (filenames) to keep during update
  imageData?: {
    buffer?: Buffer;
    originalname?: string;
    mimetype?: string;
    // For base64 data from productImage payload
    data?: string;
    name?: string;
    mimeType?: string;
    url?: string;
  } | null; // Allow null for image removal
}
