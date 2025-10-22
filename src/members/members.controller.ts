import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Patch,
} from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';
import { MemberStatus } from './member.schema';
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
  async findAll(
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: MemberStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query = {
      ...(teamId && { teamId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };

    return await this.membersService.findAll(query);
  }

  @Get('team/:teamId')
  async findByTeam(
    @Param('teamId') teamId: string,
    @Query('status') status?: MemberStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query = {
      ...(status && { status }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };

    return await this.membersService.findByTeam(teamId, query);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query('status') status?: MemberStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query = {
      ...(status && { status }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };

    return await this.membersService.findByUser(userId, query);
  }

  @Get('team/:teamId/count')
  async getTeamMembersCount(@Param('teamId') teamId: string) {
    return {
      count: await this.membersService.getTeamMembersCount(teamId),
    };
  }

  @Get('team/:teamId/count/active')
  async getActiveMembersCount(@Param('teamId') teamId: string) {
    return {
      count: await this.membersService.getActiveMembersCount(teamId),
    };
  }

  @Get('team/:teamId/status/:status')
  async getMembersByStatus(
    @Param('teamId') teamId: string,
    @Param('status') status: MemberStatus,
  ) {
    return await this.membersService.getMembersByStatus(teamId, status);
  }

  @Get('check/:userId/:teamId')
  async isMember(
    @Param('userId') userId: string,
    @Param('teamId') teamId: string,
  ) {
    return {
      isMember: await this.membersService.isMember(userId, teamId),
    };
  }

  @Get('role/:userId/:teamId')
  async getMemberRole(
    @Param('userId') userId: string,
    @Param('teamId') teamId: string,
  ) {
    return await this.membersService.getMemberRole(userId, teamId);
  }

  @Get('permission/:userId/:teamId/:permission')
  async hasPermission(
    @Param('userId') userId: string,
    @Param('teamId') teamId: string,
    @Param('permission') permission: string,
  ) {
    return {
      hasPermission: await this.membersService.hasPermission(
        userId,
        teamId,
        permission,
      ),
    };
  }

  @Get(':id')
  @CompoundZodValidation({ params: memberIdParamSchema })
  async findOne(@Param() params: { id: string }) {
    return await this.membersService.findOne(params.id);
  }

  @Post()
  @ZodValidation(createMemberSchema)
  async create(@Body() createMemberDto: CreateMemberDto) {
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
    return await this.membersService.update(params.id, updateMemberDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: MemberStatus },
  ) {
    return await this.membersService.updateStatus(id, body.status);
  }

  @Patch(':id/permissions')
  async updatePermissions(
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    return await this.membersService.updatePermissions(id, body.permissions);
  }

  @Delete(':id')
  @CompoundZodValidation({ params: memberIdParamSchema })
  async remove(@Param() params: { id: string }) {
    return await this.membersService.remove(params.id);
  }
}
