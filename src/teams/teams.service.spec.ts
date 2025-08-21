import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { TeamsRepository } from './teams.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { Team } from './team.schema';

// On crée un mock de TeamsRepository
const mockTeamsRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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
        logoUrl: 'Team logo',
      };

      const mockTeam = { ...dto, _id: 'abc123' } as Team;

      mockTeamsRepository.create.mockResolvedValue(mockTeam);

      const result = await service.create(dto);
      expect(result).toEqual(mockTeam);
      expect(mockTeamsRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});
