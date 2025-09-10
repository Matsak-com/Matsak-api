import { Module } from '@nestjs/common';
import { TeamProductService } from './team-product.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamProductController } from './team-product-controller';
import { TeamProduct, TeamProductSchema } from './team-product.schema';
import { TeamProductRepository } from './team-product.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamProduct.name, schema: TeamProductSchema },
    ]),
  ],
  controllers: [TeamProductController],
  providers: [TeamProductService, TeamProductRepository],
})
export class TeamProductModule {}
