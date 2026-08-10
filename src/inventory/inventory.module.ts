import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule'; // ← ajouté
import {
  InventoryTransaction,
  InventoryTransactionSchema,
  StockLot,
  StockLotSchema,
} from './inventory.schema';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './inventory.repository';
import { StockLotRepository } from './stock-lot.repository';
import { ExpirationAlertService } from './expiration-alert.service'; // ← ajouté
import { ExpirationAlertCron } from './expiration-alert.cron'; // ← ajouté
import { ProductModule } from '../product/product.module';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: StockLot.name, schema: StockLotSchema },
    ]),
    ProductModule,
    SearchModule,
    ScheduleModule.forRoot(), // ← ajouté, voir remarque plus bas
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
    StockLotRepository,
    ExpirationAlertService, // ← ajouté
    ExpirationAlertCron, // ← ajouté
  ],
  exports: [InventoryService, InventoryRepository, StockLotRepository],
})
export class InventoryModule {}
