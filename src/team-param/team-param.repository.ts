import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { TeamParam, TeamParamDocument } from './team-param.schema';
import { Types } from 'mongoose';

@Injectable()
export class TeamParamRepository extends BaseRepository<TeamParamDocument> {
  constructor(
    @InjectModel(TeamParam.name)
    private readonly teamParamModel: Model<TeamParamDocument>,
  ) {
    super(teamParamModel);
  }

  async findByTeam({
    teamId,
  }: {
    teamId: string;
  }): Promise<TeamParamDocument[]> {
    return this.findAll({
      filter: {
        team: Types.ObjectId.isValid(teamId)
          ? new Types.ObjectId(teamId)
          : (() => {
              throw new Error('Invalid teamId');
            })(),
      } as FilterQuery<TeamParamDocument>,
      options: { populate: [{ path: 'team' }] },
    });
  }

  async findByTeamAndType({
    teamId,
    paramType,
  }: {
    teamId: string;
    paramType: string;
  }): Promise<TeamParamDocument[]> {
    return this.findAll({
      filter: {
        team: Types.ObjectId.isValid(teamId)
          ? new Types.ObjectId(teamId)
          : (() => {
              throw new Error('Invalid teamId');
            })(),
        paramType,
      } as FilterQuery<TeamParamDocument>,
      options: { populate: [{ path: 'team' }] },
    });
  }

  async findByTeamAndName({
    teamId,
    name,
  }: {
    teamId: string;
    name: string;
  }): Promise<TeamParamDocument | null> {
    return this.findOne({
      filter: {
        team: Types.ObjectId.isValid(teamId)
          ? new Types.ObjectId(teamId)
          : (() => {
              throw new Error('Invalid teamId');
            })(),
        name,
      } as FilterQuery<TeamParamDocument>,
      options: { populate: [{ path: 'team' }] },
    });
  }
}
