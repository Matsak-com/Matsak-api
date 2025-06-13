import {
  Controller,
  Body,
  Delete,
  Get,
  Param,
  Post,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  async findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.teamsService.remove(id);
  }
}
