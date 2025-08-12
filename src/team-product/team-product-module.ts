import { Module } from '@nestjs/common';
import { TeamProductService } from './team-product.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamProductController } from './team-product-controller';
import { TeamProduct, TeamProductSchema } from './team-product.shema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamProduct.name, schema: TeamProductSchema },
    ]),
  ],
  controllers: [TeamProductController],
  providers: [TeamProductService],
})
export class TeamProductModule {}
