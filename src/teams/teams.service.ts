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
    if (createTeamDto.logoUrl && createTeamDto.logoUrl instanceof File) {
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
    };
    return this.teamsRepository.create(teamData);
  }

  async findAll(): Promise<Team[]> {
    return this.teamsRepository.findAll();
  }

  async findOne(id: string): Promise<Team | null> {
    return this.teamsRepository.findById(id);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team | null> {
    return this.teamsRepository.update(id, updateTeamDto);
  }

  async remove(id: string): Promise<Team | null> {
    return this.teamsRepository.delete(id); // ici soft delete via deleted_at
  }
}
