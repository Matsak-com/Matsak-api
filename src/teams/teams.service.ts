import { Injectable } from '@nestjs/common';
import { TeamsRepository } from './teams.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AwsS3Service } from '../aws/aws-s3.service';
import { Team } from './team.schema';
import { slugify } from '../helpers/stringUtils';
import { FilterQuery, Types } from 'mongoose';
import { MembersService } from '../members/members.service';
import { RolesService } from '../roles/roles.service';
import { MemberStatus } from '../members/member.schema';

/**
 * Service for managing teams, including creation, retrieval, updating, and deletion.
 * Handles team data persistence and logo file management via AWS S3.
 */
@Injectable()
export class TeamsService {
  /**
   * Constructs the TeamsService.
   * @param teamsRepository - Repository for team data operations.
   * @param awsS3Service - Service for AWS S3 file operations.
   * @param membersService - Service for member management operations.
   * @param rolesService - Service for role management operations.
   */
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly awsS3Service: AwsS3Service,
    private readonly membersService: MembersService,
    private readonly rolesService: RolesService,
  ) {}

  /**
   * Creates a new team with the provided data and uploads the team logo if provided.
   * @param createTeamDto - Data Transfer Object containing team creation data.
   * @returns The created team.
   */
  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    const teamData = {
      name: createTeamDto.name,
      phone: createTeamDto.phone,
      email: createTeamDto.email,
      address: createTeamDto.address,
      additionalAddress: createTeamDto.additional_address,
      city: createTeamDto.city,
      country: createTeamDto.country,
      postalCode: createTeamDto.postalCode,
      region: createTeamDto.region,
      timezone: createTeamDto.timezone,
      countryCode: createTeamDto.countryCode,
      coordinates: createTeamDto.coordinates, // Now maps directly to coordinates
      slug: slugify(createTeamDto.name),
      language: createTeamDto.language || 'fr',
    };
    const team = await this.teamsRepository.create({
      doc: teamData,
      options: { save: false },
    });
    let picture = null;
    if (createTeamDto.logoUrl) {
      picture = (
        await this.awsS3Service.uploadFile({
          file: createTeamDto.logoUrl,
          fileKey: `teams/${team._id}/logo`,
        })
      ).fileKey;
    }
    team.picture = picture;
    if (createTeamDto.userId) {
      const adminRole = await this.rolesService.findOne({
        filter: { name: 'admin' },
      });
      if (!adminRole) {
        const message =
          'Default admin role "admin" not found — cannot add user as team member. Please ensure roles are seeded.';
        console.warn(message);
        throw new Error(message);
      }
      await this.membersService.create({
        userId: createTeamDto.userId,
        role: adminRole._id.toString(),
        teams: [team._id.toString()],
        status: MemberStatus.ACTIVE,
      });
    }
    return await this.teamsRepository.create({ doc: team });
  }

  /**
   * Retrieves all teams, sorted by name.
   * @returns An array of teams or null if none found.
   */
  async findAll({
    filter,
  }: {
    filter?: FilterQuery<Team>;
  } = {}): Promise<Team[] | null> {
    const teams = await this.teamsRepository.findAll({
      filter: filter || {},
      options: {
        sort: { name: 1 },
      },
    });
    const results = await Promise.all(
      teams.map(async (team) => {
        if (team.picture) {
          team.picture = await this.awsS3Service.getFileUrl({
            fileKey: team.picture,
          });
        }
        return team;
      }),
    );
    return results;
  }

  async findByUser(userId: string): Promise<Team[] | null> {
    const aggregationPipeline = [
      {
        $lookup: {
          from: 'members',
          let: { teamId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$team', '$$teamId'] },
                    { $eq: ['$user', new Types.ObjectId(userId)] },
                    { $ne: ['$status', 'INACTIVE'] },
                  ],
                },
              },
            },
          ],
          as: 'members',
        },
      },
      {
        $match: {
          'members.0': { $exists: true },
        },
      },
      {
        $project: {
          members: 0,
        },
      },
      {
        $sort: { name: 1 },
      },
    ];

    const teams = await this.teamsRepository.aggregate(aggregationPipeline);
    const results = await Promise.all(
      teams.map(async (team) => {
        if (team.picture) {
          team.picture = await this.awsS3Service.getFileUrl({
            fileKey: team.picture,
          });
        }
        return team;
      }),
    );
    return results.length > 0 ? results : null;
  }

  /**
   * Retrieves a single team by its ID, including the logo URL if available.
   * @param id - The ID of the team to retrieve.
   * @returns The team if found, otherwise null.
   */
  async findOne(id: string): Promise<Team | null> {
    const team = await this.teamsRepository.findById({ id });
    if (team && team.picture) {
      team.picture = await this.awsS3Service.getFileUrl({
        fileKey: team.picture,
      });
    }
    return team;
  }

  /**
   * Retrieves a single team by filter criteria, including the logo URL if available.
   * @param filter - MongoDB filter query to find the team.
   * @returns The team if found, otherwise null.
   */
  async findByFilter(filter: FilterQuery<Team>): Promise<Team | null> {
    const team = await this.teamsRepository.findOne({ filter });
    if (team && team.picture) {
      team.picture = await this.awsS3Service.getFileUrl({
        fileKey: team.picture,
      });
    }
    return team;
  }

  async findMany(ids: string[]): Promise<Team[] | null> {
    const teams = await this.teamsRepository.findAll({
      filter: { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } },
    });
    if (teams.length === 0) return null;
    const results = await Promise.all(
      teams.map(async (team) => {
        if (team.picture) {
          team.picture = await this.awsS3Service.getFileUrl({
            fileKey: team.picture,
          });
        }
        return team;
      }),
    );
    return results;
  }

  /**
   * Updates an existing team with the provided data and updates the team logo if provided.
   * Deletes the previous logo from S3 if a new one is uploaded.
   * @param id - The ID of the team to update.
   * @param updateTeamDto - Data Transfer Object containing updated team data.
   * @returns The updated team if found, otherwise null.
   */
  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team | null> {
    const existingTeam = await this.teamsRepository.findById({ id });
    if (!existingTeam) return null;

    const updateData: any = {};
    let newPicture: string | null = null;

    // Only update fields that are present and different
    const fields: (keyof UpdateTeamDto)[] = [
      'name',
      'phone',
      'email',
      'address',
      'additional_address',
      'city',
      'country',
      'postalCode',
      'region',
      'timezone',
      'countryCode',
      'language',
    ];

    for (const field of fields) {
      const dtoValue = updateTeamDto[field];
      if (typeof dtoValue !== 'undefined') {
        const schemaField =
          field === 'additional_address' ? 'additionalAddress' : field;
        if (existingTeam[schemaField] !== dtoValue) {
          updateData[schemaField] = dtoValue;
        }
      }
    }

    // Handle coordinates separately - now maps directly to coordinates field
    if (typeof updateTeamDto.coordinates !== 'undefined') {
      if (
        JSON.stringify(existingTeam.coordinates) !==
        JSON.stringify(updateTeamDto.coordinates)
      ) {
        updateData.coordinates = updateTeamDto.coordinates;
      }
    }

    if (
      typeof updateTeamDto.name === 'string' &&
      updateTeamDto.name !== existingTeam.name
    ) {
      updateData.slug = slugify(updateTeamDto.name);
    }

    if (updateTeamDto.logoUrl) {
      if (existingTeam.picture) {
        await this.awsS3Service.deleteFile({ fileKey: existingTeam.picture });
      }
      newPicture = (
        await this.awsS3Service.uploadFile({
          file: updateTeamDto.logoUrl,
          fileKey: `teams/${id}/logo`,
        })
      ).fileKey;
      updateData.picture = newPicture;
    }

    if (Object.keys(updateData).length === 0) {
      return existingTeam;
    }
    return await this.teamsRepository.update({ id, update: updateData });
  }

  /**
   * Removes a team by its ID and deletes the associated logo from S3 if it exists.
   * @param id - The ID of the team to remove.
   * @returns The removed team if found, otherwise null.
   */
  async remove(id: string): Promise<Team | null> {
    const team = await this.teamsRepository.findById({
      id,
      options: {
        projection: { picture: 1 },
        lean: true,
      },
    });
    if (team && team.picture) {
      await this.awsS3Service.deleteFile({ fileKey: team.picture });
    }
    const result = await this.teamsRepository.delete({ id });
    return result;
  }
}
