import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Importation de MongooseModule
import { ImageProductService } from './image-product.service';
import { ImageProductController } from './image-product.controller';
import { ImageProduct, ImageProductSchema } from './image-product.schema'; // Importation du modèle et du schema
import { ImageProductRepository } from './image-product.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImageProduct.name, schema: ImageProductSchema }, // Enregistrement du modèle ImageProduct
    ]),
  ],
  controllers: [ImageProductController],
  providers: [ImageProductService, ImageProductRepository],
  exports: [ImageProductService, ImageProductRepository], // Exportation du service pour l'utiliser dans d'autres modules
})
export class ImageProductModule {}
