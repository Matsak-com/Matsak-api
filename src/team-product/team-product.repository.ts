import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { TeamProductDocument, TeamProduct } from './team-product.shema';

@Injectable()
export class TeamProductRepository extends BaseRepository<TeamProductDocument> {
  constructor(
    @InjectModel(TeamProduct.name)
    teamProductModel: Model<TeamProductDocument>,
  ) {
    super(teamProductModel);
  }
}
