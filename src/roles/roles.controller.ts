import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
} from '../common/schemas/role.schemas';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @CompoundZodValidation({ params: roleIdParamSchema })
  async findOne(@Param() params: { id: string }) {
    return this.rolesService.findById(params.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation(createRoleSchema)
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Put(':id')
  @CompoundZodValidation({
    params: roleIdParamSchema,
    body: updateRoleSchema,
  })
  async update(
    @Param() params: { id: string },
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(params.id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CompoundZodValidation({ params: roleIdParamSchema })
  async remove(@Param() params: { id: string }): Promise<void> {
    await this.rolesService.remove(params.id);
  }
}
