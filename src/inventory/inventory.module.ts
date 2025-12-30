import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from './inventory.schema';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './inventory.repository';
import { ProductModule } from '../product/product.module';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
    ProductModule,
    SearchModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
