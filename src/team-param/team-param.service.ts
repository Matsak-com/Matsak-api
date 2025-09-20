import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TeamParamRepository } from './team-param.repository';
import { CreateTeamParamDto } from './dto/create-team-param.dto';
import { UpdateTeamParamDto } from './dto/update-team-param.dto';
import { TeamParamDocument } from './team-param.schema';

@Injectable()
export class TeamParamService {
  constructor(private readonly teamParamRepository: TeamParamRepository) {}

  async create(
    createTeamParamDto: CreateTeamParamDto,
  ): Promise<TeamParamDocument> {
    // Check if a parameter with the same name already exists for this team
    const existingParam = await this.teamParamRepository.findByTeamAndName({
      teamId: createTeamParamDto.team,
      name: createTeamParamDto.name,
    });

    if (existingParam) {
      throw new BadRequestException(
        `A parameter with name '${createTeamParamDto.name}' already exists for this team`,
      );
    }

    // Convert the DTO to match what Mongoose expects
    const documentData = {
      ...createTeamParamDto,
      team: new Types.ObjectId(createTeamParamDto.team),
    };

    return this.teamParamRepository.create({
      doc: documentData,
    });
  }

  async findAll(): Promise<TeamParamDocument[]> {
    return this.teamParamRepository.findAll({
      options: { populate: [{ path: 'team' }] },
    });
  }

  findByTeam(teamId: string): Promise<TeamParamDocument[]> {
    return this.teamParamRepository.findByTeam({ teamId });
  }

  async findByTeamAndType(
    teamId: string,
    paramType: string,
  ): Promise<TeamParamDocument[]> {
    return this.teamParamRepository.findByTeamAndType({ teamId, paramType });
  }

  async findOne(id: string): Promise<TeamParamDocument> {
    const teamParam = await this.teamParamRepository.findById({
      id,
      options: { populate: [{ path: 'team' }] },
    });

    if (!teamParam) {
      throw new NotFoundException(`Team parameter with ID ${id} not found`);
    }

    return teamParam;
  }

  async update(
    id: string,
    updateTeamParamDto: UpdateTeamParamDto,
  ): Promise<TeamParamDocument> {
    // If name is being updated, check for conflicts
    if (updateTeamParamDto.name) {
      const currentParam = await this.findOne(id);

      if (updateTeamParamDto.name !== currentParam.name) {
        const existingParam = await this.teamParamRepository.findByTeamAndName({
          teamId: currentParam.team.toString(),
          name: updateTeamParamDto.name,
        });

        if (existingParam && existingParam._id.toString() !== id) {
          throw new BadRequestException(
            `A parameter with name '${updateTeamParamDto.name}' already exists for this team`,
          );
        }
      }
    }

    // Convert the DTO to match what Mongoose expects
    const updateData = {
      ...updateTeamParamDto,
      ...(updateTeamParamDto.team && {
        team: new Types.ObjectId(updateTeamParamDto.team),
      }),
    };

    const updatedParam = await this.teamParamRepository.update({
      id,
      update: updateData,
      options: { populate: [{ path: 'team' }] },
    });

    if (!updatedParam) {
      throw new NotFoundException(`Team parameter with ID ${id} not found`);
    }

    return updatedParam;
  }

  async remove(id: string): Promise<void> {
    const deletedParam = await this.teamParamRepository.delete({ id });

    if (!deletedParam) {
      throw new NotFoundException(`Team parameter with ID ${id} not found`);
    }
  }
}
