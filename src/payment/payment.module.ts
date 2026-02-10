import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { Payment, PaymentSchema } from './payment.schema';
import { PaymentRepository } from './payment.repository';
import { MvolaApiService } from './Mvola/mvola-api.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

// Importer UNIQUEMENT les modules
import { CartModule } from '../cart-item/cart.module';
import { ProductModule } from '../product/product.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    // ✅ Schémas Mongoose pour ce module uniquement
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),

    // ✅ Configuration HTTP
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),

    // ✅ Modules externes - ils fournissent leurs propres services
    ConfigModule,
    CartModule, // Fournit CartService, CartRepository
    ProductModule, // Fournit ProductService, ProductRepository
    InvoiceModule, // Fournit InvoiceService
    InventoryModule, // Fournit InventoryService, InventoryRepository
  ],

  controllers: [PaymentController],

  providers: [PaymentRepository, MvolaApiService, PaymentService],

  exports: [PaymentService, PaymentRepository],
})
export class PaymentModule {}
