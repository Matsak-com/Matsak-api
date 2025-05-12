import { PartialType } from '@nestjs/mapped-types';
import { CreateDetailProductDto } from './create-detail-product.dto';

export class UpdateDetailProductDto extends PartialType(CreateDetailProductDto) {}
