import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member, MemberStatus } from './member.schema';
import { MemberRepository } from './member.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.schema';

interface MemberQuery {
  teamId?: string;
  userId?: string;
  status?: MemberStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member[]> {
    let userId: string;

    // Validate that either user or userId is provided
    if (!createMemberDto.user && !createMemberDto.userId) {
      throw new BadRequestException(
        'Either user information or userId must be provided',
      );
    }

    // If user information is provided, create a new user
    if (createMemberDto.user) {
      const newUser = await this.usersService.create({
        ...createMemberDto.user,
        role: UserRole.USER, // Default role for new users
      });
      userId = newUser._id.toString();
    } else {
      // Use the provided userId
      userId = createMemberDto.userId!;
    }

    // Create members for all teams
    const createdMembers: Member[] = [];
    const errors: string[] = [];

    for (const teamId of createMemberDto.teams) {
      try {
        // Check if user is already a member of this team
        const existingMember = await this.memberRepository.findOne({
          filter: {
            user: new Types.ObjectId(userId),
            team: new Types.ObjectId(teamId),
            deleted_at: { $exists: false },
          },
        });

        if (existingMember) {
          errors.push(`User is already a member of team ${teamId}`);
          continue;
        }

        const memberData = {
          user: new Types.ObjectId(userId),
          role: new Types.ObjectId(createMemberDto.role),
          team: new Types.ObjectId(teamId),
          status: createMemberDto.status || MemberStatus.ACTIVE,
          permissions: createMemberDto.permissions || [],
          joinedAt: createMemberDto.joinedAt || new Date(),
          notes: createMemberDto.notes,
        };

        if (createMemberDto.invitedBy) {
          (memberData as any).invitedBy = new Types.ObjectId(
            createMemberDto.invitedBy,
          );
        }

        const newMember = await this.memberRepository.create({
          doc: memberData as any,
        });

        createdMembers.push(newMember);
      } catch (error) {
        errors.push(`Failed to add user to team ${teamId}: ${error.message}`);
      }
    }

    // If no members were created and there are errors, throw an exception
    if (createdMembers.length === 0 && errors.length > 0) {
      throw new ConflictException(
        `Failed to create members: ${errors.join(', ')}`,
      );
    }

    // If some members were created but there were also errors, you might want to log warnings
    if (errors.length > 0) {
      console.warn('Some members could not be created:', errors);
    }

    return createdMembers;
  }

  async findAll(query: MemberQuery = {}): Promise<Member[]> {
    const { teamId, userId, status, page = 1, limit = 10 } = query;

    const filter: any = { deleted_at: { $exists: false } };

    if (teamId) {
      filter.team = new Types.ObjectId(teamId);
    }

    if (userId) {
      filter.user = new Types.ObjectId(userId);
    }

    if (status) {
      filter.status = status;
    }

    const options: any = {
      populate: ['user', 'role', 'team'],
      skip: (page - 1) * limit,
      limit,
      sort: { createdAt: -1 },
    };

    return await this.memberRepository.findAll({ filter, options });
  }

  async findOne(id: string): Promise<Member | null> {
    const member = await this.memberRepository.findById({ id });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    return member;
  }

  async findByTeam(
    teamId: string,
    query: Partial<MemberQuery> = {},
  ): Promise<Member[]> {
    return this.findAll({ ...query, teamId });
  }

  async findByUser(
    userId: string,
    query: Partial<MemberQuery> = {},
  ): Promise<Member[]> {
    return this.findAll({ ...query, userId });
  }

  async update(
    id: string,
    updateMemberDto: UpdateMemberDto,
  ): Promise<Member | null> {
    const existingMember = await this.memberRepository.findById({ id });
    if (!existingMember) {
      throw new NotFoundException('Member not found');
    }

    const updateData: any = { ...updateMemberDto };

    // Convert string IDs to ObjectIds if provided
    if (updateMemberDto.role) {
      updateData.role = new Types.ObjectId(updateMemberDto.role);
    }
    if (updateMemberDto.userId) {
      updateData.user = new Types.ObjectId(updateMemberDto.userId);
    }

    updateData.lastActiveAt = new Date();

    return await this.memberRepository.update({
      id,
      update: updateData,
    });
  }

  async updateStatus(id: string, status: MemberStatus): Promise<Member | null> {
    const member = await this.memberRepository.findById({ id });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return await this.memberRepository.update({
      id,
      update: {
        status,
        lastActiveAt: new Date(),
      },
    });
  }

  async updatePermissions(
    id: string,
    permissions: string[],
  ): Promise<Member | null> {
    const member = await this.memberRepository.findById({ id });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return await this.memberRepository.update({
      id,
      update: {
        permissions,
        lastActiveAt: new Date(),
      },
    });
  }

  async remove(id: string): Promise<Member | null> {
    const member = await this.memberRepository.findById({ id });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return await this.memberRepository.update({
      id,
      update: { deleted_at: new Date() },
    });
  }

  async getTeamMembersCount(teamId: string): Promise<number> {
    const members = await this.findAll({ teamId });
    return members.length;
  }

  async getActiveMembersCount(teamId: string): Promise<number> {
    const members = await this.findAll({
      teamId,
      status: MemberStatus.ACTIVE,
    });
    return members.length;
  }

  async getMembersByStatus(
    teamId: string,
    status: MemberStatus,
  ): Promise<Member[]> {
    return await this.findAll({ teamId, status });
  }

  async isMember(userId: string, teamId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      filter: {
        user: new Types.ObjectId(userId),
        team: new Types.ObjectId(teamId),
        deleted_at: { $exists: false },
      },
    });

    return !!member;
  }

  async getMemberRole(userId: string, teamId: string): Promise<Member | null> {
    return await this.memberRepository.findOne({
      filter: {
        user: new Types.ObjectId(userId),
        team: new Types.ObjectId(teamId),
        deleted_at: { $exists: false },
      },
    });
  }

  async hasPermission(
    userId: string,
    teamId: string,
    permission: string,
  ): Promise<boolean> {
    const member = await this.getMemberRole(userId, teamId);

    if (!member) {
      return false;
    }

    return member.permissions.includes(permission);
  }

  /**
   * Returns all members of teams where the specified user is a member
   * @param userId - The ID of the user
   * @returns Array of members from all teams where the user is a member
   */
  async getTeamMembersByUserId(userId: string): Promise<Member[]> {
    const aggregationPipeline = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deleted_at: { $exists: false },
          status: { $ne: MemberStatus.INACTIVE },
        },
      },
      {
        $group: {
          _id: null,
          teamIds: { $addToSet: '$team' },
        },
      },
      {
        $lookup: {
          from: 'members',
          let: { teamIds: '$teamIds' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$team', '$$teamIds'] },
                deleted_at: { $exists: false },
                status: { $ne: MemberStatus.INACTIVE },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userInfo',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      firstName: 1,
                      lastName: 1,
                      email: 1,
                      phone: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: 'teams',
                localField: 'team',
                foreignField: '_id',
                as: 'teamInfo',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      slug: 1,
                      email: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: 'roles',
                localField: 'role',
                foreignField: '_id',
                as: 'roleInfo',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      level: 1,
                    },
                  },
                ],
              },
            },
            {
              $project: {
                _id: 1,
                user: { $arrayElemAt: ['$userInfo', 0] },
                team: { $arrayElemAt: ['$teamInfo', 0] },
                role: { $arrayElemAt: ['$roleInfo', 0] },
                status: 1,
                permissions: 1,
                joinedAt: '$createdAt',
                notes: 1,
              },
            },
          ],
          as: 'allTeamMembers',
        },
      },
      {
        $project: {
          _id: 0,
          members: '$allTeamMembers',
        },
      },
    ];

    const result = await this.memberRepository.aggregate(aggregationPipeline);
    return result.length > 0 ? result[0].members : [];
  }
}
