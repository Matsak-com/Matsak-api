import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { Payment, PaymentSchema } from './payment.schema';
import { PaymentRepository } from './payment.repository';
import { MvolaApiService } from './Mvola/mvola-api.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentMockController } from './payment-mock.controller';
import { MvolaWebhookGuard } from './guards/mvola-webhook.guard';

import { CartModule } from '../cart-item/cart.module';
import { ProductModule } from '../product/product.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { InventoryModule } from '../inventory/inventory.module';

// Import statique obligatoire pour que TypeScript/NestJS compile correctement.
// Le fichier payment-mock.controller.ts DOIT exister dans le projet.
// Le chargement conditionnel se fait via le spread dans controllers[].
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    HttpModule.register({ timeout: 10000, maxRedirects: 3 }),
    ConfigModule,
    CartModule,
    ProductModule,
    InvoiceModule,
    InventoryModule,
  ],

  controllers: [
    PaymentController,
    // PaymentMockController est dans le bundle mais NestJS ne l'enregistre
    // pas comme controller actif en production → ses routes n'existent pas.
    ...(isProduction ? [] : [PaymentMockController]),
  ],

  providers: [
    PaymentRepository,
    MvolaApiService,
    MvolaWebhookGuard,
    PaymentService,
  ],

  exports: [PaymentService, PaymentRepository],
})
export class PaymentModule {}