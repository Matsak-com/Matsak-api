import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductDecond, ProductDecondSchema } from './product-decond.schema';
import { ProductDecondService } from './product-decond.service';
import { ProductDecondController } from './product-decond.controller';
import { ImageProduct, ImageProductSchema } from 'src/image-product/image-product.schema';
import { DetailProduct, DetailProductSchema } from 'src/detail-product/detail-product.schema';
import { DetailProductModule } from 'src/detail-product/detail-product.module';
import { ImageProductModule } from 'src/image-product/image-product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductDecond.name, schema: ProductDecondSchema },
      { name: ImageProduct.name, schema: ImageProductSchema },
      { name: DetailProduct.name, schema: DetailProductSchema },
    ]),
    DetailProductModule, 
    ImageProductModule,  
  ],
  providers: [ProductDecondService],
  controllers: [ProductDecondController],
})
export class ProductDecondModule {}
