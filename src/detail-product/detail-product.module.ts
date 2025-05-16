import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DetailProduct, DetailProductSchema } from './detail-product.schema';
import { DetailProductService } from './detail-product.service';
import { DetailProductController } from './detail-product.controller';
import { DetailProductRepository } from './detail-product.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DetailProduct.name, schema: DetailProductSchema },
    ]),
  ],
  controllers: [DetailProductController],
  providers: [DetailProductService, DetailProductRepository],
})
export class DetailProductModule {}
