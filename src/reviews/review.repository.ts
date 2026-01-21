import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Review, ReviewDocument } from './review.schema';

@Injectable()
export class ReviewRepository extends BaseRepository<ReviewDocument> {
  constructor(
    @InjectModel(Review.name)
    reviewModel: Model<ReviewDocument>,
  ) {
    super(reviewModel);
  }
}
