import { Injectable } from '@nestjs/common';
import { TeamsRepository } from './teams.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './team.schema';

@Injectable()
export class TeamsService {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    return this.teamsRepository.create(createTeamDto);
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
