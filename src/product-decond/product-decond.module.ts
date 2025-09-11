import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductDecond, ProductDecondSchema } from './product-decond.schema';
import { ProductDecondService } from './product-decond.service';
import { ProductDecondController } from './product-decond.controller';
import { ProductDecondRepository } from './product-decond.repository';
import { DetailProductModule } from 'src/detail-product/detail-product.module';
import { ImageProductModule } from 'src/image-product/image-product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductDecond.name, schema: ProductDecondSchema },
    ]),
    DetailProductModule,
    ImageProductModule,
  ],
  providers: [ProductDecondService, ProductDecondRepository],
  controllers: [ProductDecondController],
  exports: [ProductDecondService, ProductDecondRepository],
})
export class ProductDecondModule {}
