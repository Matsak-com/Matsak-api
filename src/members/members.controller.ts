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

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  async findAll() {
    // Call the service to get all members
    return await this.membersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Call the service to get a single member by ID
    return await this.membersService.findOne(id);
  }

  @Post()
  async create(@Body() createMemberDto: CreateMemberDto) {
    // Call the service to create a new member
    return await this.membersService.create(createMemberDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    // Call the service to update a member by ID
    return await this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Call the service to delete a member by ID
    return await this.membersService.remove(id);
  }
}
