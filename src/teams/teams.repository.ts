import { Model } from 'mongoose';
import { Team, TeamDocument } from './team.schema';
import { BaseRepository } from '../common/base.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class TeamsRepository extends BaseRepository<TeamDocument> {
  constructor(@InjectModel(Team.name) TeamModel: Model<TeamDocument>) {
    super(TeamModel);
  }
}
