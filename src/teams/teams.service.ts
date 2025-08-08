import { Injectable } from '@nestjs/common';
import { TeamsRepository } from './teams.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AwsS3Service } from '../aws/aws-s3.service';
import { Team } from './team.schema';
import { slugify } from 'src/helpers/stringUtils';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    let picture = null;
    if (createTeamDto.logoUrl) {
      picture = (
        await this.awsS3Service.uploadFile({ file: createTeamDto.logoUrl })
      ).fileKey;
    }

    const teamData = {
      name: createTeamDto.name,
      phone: createTeamDto.phone,
      email: createTeamDto.email,
      address: createTeamDto.address,
      additionalAddress: createTeamDto.additional_address,
      city: createTeamDto.city,
      country: createTeamDto.country,
      postalCode: createTeamDto.postalCode,
      region: createTeamDto.region,
      timezone: createTeamDto.timezone,
      countryCode: createTeamDto.countryCode,
      coordinates: createTeamDto.coordinates,
      slug: slugify(createTeamDto.name),
      picture,
      language: createTeamDto.language || 'fr',
    };
    return this.teamsRepository.create(teamData);
  }

  async findAll(): Promise<Team[] | null> {
    const teams = await this.teamsRepository.findAll();
    teams.sort((a, b) => a.name.localeCompare(b.name));
    await Promise.all(
      teams.map(async (team) => {
        if (team.picture) {
          team.picture = await this.awsS3Service.getFileUrl({
            fileKey: team.picture,
          });
        } else {
          team.picture = null;
        }
      }),
    );
    return teams;
  }

  async findOne(id: string): Promise<Team | null> {
    const team = await this.teamsRepository.findById(id);
    if (team && team.picture) {
      team.picture = await this.awsS3Service.getFileUrl({
        fileKey: team.picture,
      });
    }
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team | null> {
    return this.teamsRepository.update(id, updateTeamDto);
  }

  async remove(id: string): Promise<Team | null> {
    const team = await this.teamsRepository.findById(id, {
      projection: { picture: 1 },
      lean: true,
    });
    if (team && team.picture) {
      await this.awsS3Service.deleteFile({ fileKey: team.picture });
    }
    const result = await this.teamsRepository.delete(id); // ici soft delete via deleted_at
    return result;
  }
}
