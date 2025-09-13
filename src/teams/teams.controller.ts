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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import { ZodMultipartInterceptor } from '../common/interceptors/zod-multipart.interceptor';
import {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
} from '../common/schemas/team.schemas';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('logoUrl'),
    new ZodMultipartInterceptor(createTeamSchema),
  )
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

  @Get(':id')
  @CompoundZodValidation({ params: teamIdParamSchema })
  async findOne(@Param() params: { id: string }) {
    return this.teamsService.findOne(params.id);
  }

  @Put(':id')
  @UseInterceptors(
    FileInterceptor('logoUrl'),
    new ZodMultipartInterceptor(updateTeamSchema),
  )
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CompoundZodValidation({ params: teamIdParamSchema })
  async remove(@Param() params: { id: string }) {
    await this.teamsService.remove(params.id);
  }
}
