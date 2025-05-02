import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './team.schema';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    const newTeam = new this.teamModel(createTeamDto);
    return await newTeam.save();
  }

  async findAll(): Promise<Team[]> {
    return await this.teamModel.find();
  }

  async findOne(id: string): Promise<Team | null> {
    return await this.teamModel.findById(id);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team | null> {
    return await this.teamModel.findByIdAndUpdate(id, updateTeamDto, {
      new: true,
    });
  }

  async remove(id: string): Promise<Team | null> {
    return await this.teamModel.findByIdAndDelete(id);
  }
}
