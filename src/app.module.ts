import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SubCategoriesModule } from './sub-categories/sub-categories.module';
import { DetailProductModule } from './detail-product/detail-product.module';
import { ImageProductModule } from './image-product/image-product.module';
import { ProductDecondModule } from './product-decond/product-decond.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/matsak'),
    UsersModule, 
    AuthModule,
    CategoriesModule,
    ConfigModule.forRoot(),
    SubCategoriesModule,
    DetailProductModule,
    ImageProductModule,
    ProductDecondModule,
    ProductModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
