import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Faq, FaqSchema } from './faq.schema';
import { FaqsController } from './faqs.controller';
import { FaqsRepository } from './faqs.repository';
import { FaqsService } from './faqs.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }])],
  controllers: [FaqsController],
  providers: [FaqsService, FaqsRepository],
  exports: [FaqsService],
})
export class FaqsModule {}
