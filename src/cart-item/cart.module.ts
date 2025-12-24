// src/cart/cart.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './cart-item.schema';
import { CartRepository } from './cart.repository';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
    ]),
    ProductModule,
  ],
  controllers: [CartController],
  providers: [CartService, CartRepository],
})
export class CartModule {}
