import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DetailProduct, DetailProductSchema } from './detail-product.schema';
import { DetailProductService } from './detail-product.service';
import { DetailProductController } from './detail-product.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DetailProduct.name, schema: DetailProductSchema }
    ])
  ],
  controllers: [DetailProductController],
  providers: [DetailProductService],
})
export class DetailProductModule {}
