import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.schema';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { DetailProductModule } from '../detail-product/detail-product.module';
import { ImageProductModule } from '../image-product/image-product.module';
import { MembersModule } from '../members/members.module';
import { SearchModule } from '../elasticsearch/elasticsearch.module';
import { ProductCsvService } from './csv/product-csv.service';
import { Category, CategorySchema } from '../categories/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    SearchModule,
    DetailProductModule,
    ImageProductModule,
    MembersModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductCsvService],
  exports: [ProductService, ProductRepository, ProductCsvService],
})
export class ProductModule {}
