import { UpdateDetailProductDto } from '../../detail-product/dto/update-detail-product.dto';

export class UpdateProductDto {
  detailData?: UpdateDetailProductDto;
  subcategoryId?: string;
  isActive?: boolean;
  imageData?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    altText?: string;
  };
}
