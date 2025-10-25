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
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  UseGuards,
} from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import { ZodMultipart } from '../common/decorators/zod-multipart.decorator';
import {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
} from '../common/schemas/team.schemas';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodMultipart(createTeamSchema)
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    logoUrl: Express.Multer.File,
  ) {
    return await this.teamsService.create({ ...createTeamDto, logoUrl });
  }

  @Get()
  async findAll() {
    return this.teamsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async findByUser(@Param() params: { userId: string }) {
    return this.teamsService.findByUser(params.userId);
  }

  @Get(':id')
  @CompoundZodValidation({ params: teamIdParamSchema })
  async findOne(@Param() params: { id: string }) {
    return this.teamsService.findOne(params.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ZodMultipart(updateTeamSchema)
  @CompoundZodValidation({ params: teamIdParamSchema })
  async update(
    @Param() params: { id: string },
    @Body() updateTeamDto: UpdateTeamDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    logoUrl: Express.Multer.File,
  ) {
    return this.teamsService.update(params.id, { ...updateTeamDto, logoUrl });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CompoundZodValidation({ params: teamIdParamSchema })
  async remove(@Param() params: { id: string }) {
    await this.teamsService.remove(params.id);
  }
}
