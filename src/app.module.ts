import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
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
import { TeamParamModule } from './team-param/team-param.module';
import { AddressModule } from './client/address.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationModule } from './notifications/notification.module';
import { BullModule } from '@nestjs/bull';
import { PreferenceModule } from './preference/preference.module';
import { FaqsModule } from './faqs/faqs.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PaymentModule } from './payment/payment.module';
import { InvoiceModule } from './invoice/invoice.module';

/**
 * Parse and validate Redis configuration
 * BullJS accepts either a connection URL string or a configuration object
 */
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;

  // If REDIS_URL is provided, validate it's a proper Redis URL
  if (redisUrl) {
    const redisUrlPattern = /^redis:\/\/.+/i;
    if (!redisUrlPattern.test(redisUrl)) {
      console.warn(
        `⚠️  REDIS_URL is set but doesn't match redis:// format: ${redisUrl}`,
      );
      console.warn('Falling back to REDIS_HOST/REDIS_PORT configuration');
    } else {
      // Valid Redis URL, return it as string for Bull to parse
      return redisUrl;
    }
  }

  // Fallback to host/port configuration
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };
}

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/matsak',
      {
        dbName:
          process.env.MONGO_DB_NAME ||
          (process.env.NODE_ENV === 'production' ? 'matsakprod' : 'matsak'),
      },
    ),
    BullModule.forRoot({
      redis: getRedisConfig(),
    }),
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
    TeamParamModule,
    AddressModule,
    InventoryModule,
    NotificationModule,
    PreferenceModule,
    FaqsModule,
    ReviewsModule,
    PaymentModule,
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
