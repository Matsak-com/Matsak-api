/**
 * Intégration du ProductCsvService dans le module Product
 * 
 * Mise à jour requise pour product.module.ts
 */

// AVANT
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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    SearchModule,
    DetailProductModule,
    ImageProductModule,
    MembersModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService, ProductRepository],
})
export class ProductModule {}


// APRÈS - Mise à jour requise
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.schema';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { ProductCsvService } from './csv/product-csv.service'; // ADD THIS
import { DetailProductModule } from '../detail-product/detail-product.module';
import { ImageProductModule } from '../image-product/image-product.module';
import { MembersModule } from '../members/members.module';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    SearchModule,
    DetailProductModule,
    ImageProductModule,
    MembersModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductCsvService], // ADD ProductCsvService
  exports: [ProductService, ProductRepository, ProductCsvService], // EXPORT ProductCsvService
})
export class ProductModule {}
