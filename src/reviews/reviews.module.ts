import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from '../teams/team.schema';
import { Review, ReviewSchema } from './review.schema';
import { ReviewRepository } from './review.repository';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Review.name,
        schema: ReviewSchema,
      },
      {
        name: Team.name,
        schema: TeamSchema,
      },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewRepository],
  exports: [ReviewsService, ReviewRepository],
})
export class ReviewsModule {}
