import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './team.schema';

describe('TeamsController', () => {
  let controller: TeamsController;
  let service: TeamsService;

  const mockTeam: Team = {
      _id: '123',
      email: 'team@example.com',
      region: 'Analamanga',
      address: '123 Street',
      city: 'Tana',
      postalCode: '101',
      country: 'MG',
      language: 'fr',
      timezone: 'Indian/Antananarivo',
      slug: 'team-slug',
      name: 'Team Name',
      createdAt: new Date(),
      updatedAt: new Date(),
  } as unknown as Team;

  const mockTeamsService = {
    create: jest.fn().mockResolvedValue(mockTeam),
    findAll: jest.fn().mockResolvedValue([mockTeam]),
    findOne: jest.fn().mockResolvedValue(mockTeam),
    update: jest.fn().mockResolvedValue({ ...mockTeam, name: 'Updated Name' }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a team', async () => {
      const dto: CreateTeamDto = {
        name: 'Team Example',
        description : 'Team description',
        logoUrl : 'Team logo'
      };
      const result = await controller.create(dto);
      expect(result).toEqual(mockTeam);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of teams', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockTeam]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one team', async () => {
      const result = await controller.findOne('123');
      expect(result).toEqual(mockTeam);
      expect(service.findOne).toHaveBeenCalledWith('123');
    });
  });

  describe('update', () => {
    it('should update a team', async () => {
      const dto: UpdateTeamDto = { name: 'Updated Name' };
      const result = await controller.update('123', dto);
      expect(result).toEqual({ ...mockTeam, name: 'Updated Name' });
      expect(service.update).toHaveBeenCalledWith('123', dto);
    });
  });

  describe('remove', () => {
    it('should remove a team', async () => {
      const result = await controller.remove('123');
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('123');
    });
  });
});
