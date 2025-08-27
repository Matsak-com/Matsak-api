import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TeamsModule } from './teams/teams.module';
import { MembersModule } from './members/members.module';
import { RolesModule } from './roles/roles.module';
import { SubCategoriesModule } from './sub-categories/sub-categories.module';
import { DetailProductModule } from './detail-product/detail-product.module';
import { ImageProductModule } from './image-product/image-product.module';
import { ProductDecondModule } from './product-decond/product-decond.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart-item/cart.module';
import { SessionMiddleware } from './middleware/session.middleware';
import { TeamProductModule } from './team-product/team-product-module';
import { AddressModule } from './client/address.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/matsak',
    ),
    UsersModule,
    AuthModule,
    ConfigModule.forRoot(),
    TeamsModule,
    MembersModule,
    RolesModule,
    CategoriesModule,
    ConfigModule.forRoot(),
    SubCategoriesModule,
    DetailProductModule,
    ImageProductModule,
    ProductDecondModule,
    ProductModule,
    CartModule, 
    TeamProductModule,
    AddressModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
