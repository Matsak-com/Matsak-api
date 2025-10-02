import { UpdateDetailProductDto } from '../../detail-product/dto/update-detail-product.dto';
import { DiscountDto } from './pricing.dto';

export class UpdateProductDto {
  detailData?: UpdateDetailProductDto;
  isActive?: boolean;
  basePrice?: number;
  currency?: string;
  teamId?: string;
  discounts?: DiscountDto[];
  imageData?: {
    buffer?: Buffer;
    originalname?: string;
    mimetype?: string;
    altText?: string;
    // For base64 data from productImage payload
    data?: string;
    name?: string;
    mimeType?: string;
    url?: string;
  };
}
