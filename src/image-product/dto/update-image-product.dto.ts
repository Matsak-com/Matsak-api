import { PartialType } from '@nestjs/mapped-types';
import { CreateImageProductDto } from './create-image-product.dto';

export class UpdateImageProductDto extends PartialType(CreateImageProductDto) {
  buffer?: Buffer; // pour les images en mémoire
  originalname?: string; // nom original du fichier
  mimetype?: string; // type MIME du fichier
}
