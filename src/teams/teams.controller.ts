import { Controller } from '@nestjs/common';
import { Body, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  async create(@Body() createTeamDto: CreateTeamDto) {
    return await this.teamsService.create(createTeamDto);
  }

  @Get()
  async findAll() {
    return await this.teamsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.teamsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return await this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.teamsService.remove(id);
  }
}
