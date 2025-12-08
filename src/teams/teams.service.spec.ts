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
  findOne: jest.fn(),
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
        _id: 'abc123',
        name: 'Team Example',
        phone: '123456789',
        email: 'team@example.com',
        language: 'en',
        slug: 'team-example',
        picture: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockTeamsRepository.create.mockResolvedValue(mockTeam);

      const result = await service.create(dto);
      expect(result.name).toBe('Team Example');
      expect(result.slug).toBe('team-example');
      expect(mockTeamsRepository.create).toHaveBeenCalledWith({
        doc: expect.objectContaining({
          name: 'Team Example',
          phone: '123456789',
          email: 'team@example.com',
          language: 'en',
          slug: 'team-example',
        }),
        options: { save: false },
      });
    });
  });

  describe('findByFilter', () => {
    it('should return a team when found by filter', async () => {
      const mockTeam = {
        _id: 'team-id-123',
        name: 'Test Team',
        slug: 'test-team',
        email: 'test@team.com',
        picture: null,
      };

      mockTeamsRepository.findOne.mockResolvedValue(mockTeam);

      const result = await service.findByFilter({ slug: 'test-team' });

      expect(result).toEqual(mockTeam);
      expect(mockTeamsRepository.findOne).toHaveBeenCalledWith({
        filter: { slug: 'test-team' },
      });
    });

    it('should resolve picture URL when team has a picture', async () => {
      const mockTeam = {
        _id: 'team-id-456',
        name: 'Team With Logo',
        slug: 'team-with-logo',
        email: 'logo@team.com',
        picture: 'teams/logo.png',
      };

      const mockTeamWithUrl = {
        ...mockTeam,
        picture: 'https://s3.amazonaws.com/bucket/teams/logo.png',
      };

      mockTeamsRepository.findOne.mockResolvedValue(mockTeam);
      mockAwsS3Service.getFileUrl.mockResolvedValue(
        'https://s3.amazonaws.com/bucket/teams/logo.png',
      );

      const result = await service.findByFilter({ email: 'logo@team.com' });

      expect(result).toEqual(mockTeamWithUrl);
      expect(mockAwsS3Service.getFileUrl).toHaveBeenCalledWith({
        fileKey: 'teams/logo.png',
      });
    });

    it('should return null when team is not found', async () => {
      mockTeamsRepository.findOne.mockResolvedValue(null);

      const result = await service.findByFilter({ slug: 'nonexistent' });

      expect(result).toBeNull();
      expect(mockTeamsRepository.findOne).toHaveBeenCalledWith({
        filter: { slug: 'nonexistent' },
      });
    });

    it('should accept complex filter queries', async () => {
      const mockTeam = {
        _id: 'team-id-789',
        name: 'Complex Team',
        slug: 'complex-team',
        email: 'complex@team.com',
        picture: null,
      };

      mockTeamsRepository.findOne.mockResolvedValue(mockTeam);

      const complexFilter = {
        $and: [{ slug: 'complex-team' }, { email: 'complex@team.com' }],
      };

      const result = await service.findByFilter(complexFilter);

      expect(result).toEqual(mockTeam);
      expect(mockTeamsRepository.findOne).toHaveBeenCalledWith({
        filter: complexFilter,
      });
    });
  });
});
