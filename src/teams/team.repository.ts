import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Team, TeamDocument } from './team.schema';

@Injectable()
export class TeamRepository extends BaseRepository<TeamDocument> {
  constructor(
    @InjectModel(Team.name)
    teamModel: Model<TeamDocument>,
  ) {
    super(teamModel);
  }
}
