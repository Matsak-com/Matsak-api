import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryService } from './history.service';
import { History, HistorySchema } from './history.schema';
import { HistoryController } from './history.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: History.name,
        schema: HistorySchema,
      },
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
