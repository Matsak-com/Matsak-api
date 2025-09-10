import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeamParamService } from './team-param.service';
import { CreateTeamParamDto } from './dto/create-team-param.dto';
import { UpdateTeamParamDto } from './dto/update-team-param.dto';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  createTeamParamSchema,
  updateTeamParamSchema,
  teamParamIdParamSchema,
  teamIdParamSchema,
  teamParamQuerySchema,
  TeamParamIdParam,
  TeamIdParam,
  TeamParamQuery,
} from '../common/schemas/team-param.schemas';

@Controller('team-params')
export class TeamParamController {
  constructor(private readonly teamParamService: TeamParamService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation(createTeamParamSchema)
  async create(@Body() createTeamParamDto: CreateTeamParamDto) {
    return this.teamParamService.create(createTeamParamDto);
  }

  @Get()
  @CompoundZodValidation({ query: teamParamQuerySchema })
  async findAll(@Query() query: TeamParamQuery) {
    if (query.team) {
      if (query.paramType) {
        return this.teamParamService.findByTeamAndType(
          query.team,
          query.paramType,
        );
      }
      return this.teamParamService.findByTeam(query.team);
    }
    return this.teamParamService.findAll();
  }

  @Get('team/:teamId')
  @CompoundZodValidation({ params: teamIdParamSchema })
  async findByTeam(@Param() params: TeamIdParam) {
    return this.teamParamService.findByTeam(params.teamId);
  }

  @Get('team/:teamId/type/:paramType')
  @CompoundZodValidation({
    params: teamIdParamSchema.extend({
      paramType: teamParamQuerySchema.shape.paramType,
    }),
  })
  async findByTeamAndType(
    @Param() params: TeamIdParam & { paramType: string },
  ) {
    return this.teamParamService.findByTeamAndType(
      params.teamId,
      params.paramType,
    );
  }

  @Get(':id')
  @CompoundZodValidation({ params: teamParamIdParamSchema })
  async findOne(@Param() params: TeamParamIdParam) {
    return this.teamParamService.findOne(params.id);
  }

  @Patch(':id')
  @CompoundZodValidation({
    params: teamParamIdParamSchema,
    body: updateTeamParamSchema,
  })
  async update(
    @Param() params: TeamParamIdParam,
    @Body() updateTeamParamDto: UpdateTeamParamDto,
  ) {
    return this.teamParamService.update(params.id, updateTeamParamDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CompoundZodValidation({ params: teamParamIdParamSchema })
  async remove(@Param() params: TeamParamIdParam) {
    return this.teamParamService.remove(params.id);
  }
}
