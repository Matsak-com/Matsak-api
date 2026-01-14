import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Faq, FaqDocument } from './faq.schema';

@Injectable()
export class FaqsRepository extends BaseRepository<FaqDocument> {
  constructor(
    @InjectModel(Faq.name)
    faqModel: Model<FaqDocument>,
  ) {
    super(faqModel);
  }
}
