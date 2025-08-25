import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  createMemberSchema,
  updateMemberSchema,
  memberIdParamSchema,
} from '../common/schemas/member.schemas';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  async findAll() {
    // Call the service to get all members
    return await this.membersService.findAll();
  }

  @Get(':id')
  @CompoundZodValidation({ params: memberIdParamSchema })
  async findOne(@Param() params: { id: string }) {
    // Call the service to get a single member by ID
    return await this.membersService.findOne(params.id);
  }

  @Post()
  @ZodValidation(createMemberSchema)
  async create(@Body() createMemberDto: CreateMemberDto) {
    // Call the service to create a new member
    return await this.membersService.create(createMemberDto);
  }

  @Put(':id')
  @CompoundZodValidation({
    params: memberIdParamSchema,
    body: updateMemberSchema,
  })
  async update(
    @Param() params: { id: string },
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    // Call the service to update a member by ID
    return await this.membersService.update(params.id, updateMemberDto);
  }

  @Delete(':id')
  @CompoundZodValidation({ params: memberIdParamSchema })
  async remove(@Param() params: { id: string }) {
    // Call the service to delete a member by ID
    return await this.membersService.remove(params.id);
  }
}
