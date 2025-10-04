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

  /**
   * Update a team parameter with discriminator-aware validation
   * This method handles updates for different parameter types properly
   */
  async updateWithDiscriminator({
    id,
    update,
    options = {},
  }: {
    id: string | Types.ObjectId;
    update: Partial<TeamParamDocument>;
    options?: { populate?: any[] };
  }): Promise<TeamParamDocument | null> {
    const objectId = typeof id === 'string' ? new Types.ObjectId(id) : id;

    // First, get the current document to determine its discriminator type
    const currentDoc = await this.findById({
      id: objectId,
      options: { lean: true },
    });

    if (!currentDoc) {
      return null;
    }

    // Use the discriminator model for type-specific validation
    const discriminatorModel =
      this.teamParamModel.discriminators?.[currentDoc.paramType];

    if (discriminatorModel) {
      // Use the specific discriminator model for the update
      const result = await discriminatorModel.findOneAndUpdate(
        this.withNotDeleted({
          _id: objectId,
        } as FilterQuery<TeamParamDocument>),
        update,
        {
          new: true,
          runValidators: true,
          ...(options.populate && { populate: options.populate }),
        },
      );
      return result;
    } else {
      // Fallback to base model if discriminator not found
      return this.update({ id: objectId, update, options });
    }
  }
}
