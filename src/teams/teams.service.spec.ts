import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { TeamsRepository } from './teams.repository';
import { AwsS3Service } from '../aws/aws-s3.service';
import { MembersService } from '../members/members.service';
import { RolesService } from '../roles/roles.service';
import { CreateTeamDto } from './dto/create-team.dto';

// On crée un mock de TeamsRepository
const mockTeamsRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAwsS3Service = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
};

const mockMembersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockRolesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: TeamsRepository,
          useValue: mockTeamsRepository,
        },
        {
          provide: AwsS3Service,
          useValue: mockAwsS3Service,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a team', async () => {
      const dto: CreateTeamDto = {
        name: 'Team Example',
        description: 'Team description',
        phone: '123456789',
        email: 'team@example.com',
        language: 'en',
        // logoUrl expects an uploaded file; tests can provide undefined
        logoUrl: undefined,
      };

      const mockTeam = {
        ...dto,
        _id: 'abc123',
        slug: 'team-example',
        toObject: jest
          .fn()
          .mockReturnValue({ ...dto, _id: 'abc123', slug: 'team-example' }),
      };

      mockTeamsRepository.create.mockResolvedValue(mockTeam);

      const result = await service.create(dto);
      expect(result).toEqual(mockTeam);
      expect(mockTeamsRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});
