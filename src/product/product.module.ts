import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { Product, ProductSchema } from './product.schema';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { DetailProductModule } from '../detail-product/detail-product.module';
import { ImageProductModule } from '../image-product/image-product.module';
import { SearchService } from 'src/elasticsearch/elasticsearch.service';
import { MembersModule } from '../members/members.module';
import { SearchModule } from 'src/elasticsearch/elasticsearch.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    SearchModule,
    DetailProductModule,
    ImageProductModule,
    MembersModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, SearchService],
  exports: [ProductService, ProductRepository, SearchService],
})
export class ProductModule {}