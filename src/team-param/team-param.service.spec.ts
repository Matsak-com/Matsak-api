import { Test, TestingModule } from '@nestjs/testing';
import { TeamParamService } from './team-param.service';
import { TeamParamRepository } from './team-param.repository';
import { getModelToken } from '@nestjs/mongoose';
import { TeamParam } from './team-param.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TeamParamService', () => {
  let service: TeamParamService;

  const mockTeamParamRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByTeam: jest.fn(),
    findByTeamAndType: jest.fn(),
    findByTeamAndName: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamParamService,
        {
          provide: TeamParamRepository,
          useValue: mockTeamParamRepository,
        },
        {
          provide: getModelToken(TeamParam.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<TeamParamService>(TeamParamService);

    // Reset all mocks before each test
    Object.values(mockTeamParamRepository).forEach((mock) => mock.mockReset());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a team param successfully', async () => {
      const createDto = {
        team: '507f1f77bcf86cd799439011',
        name: 'show-number',
        paramType: 'ShowNumberParam' as const,
        value: true,
      };

      const expectedResult = { ...createDto, _id: '507f1f77bcf86cd799439012' };

      mockTeamParamRepository.findByTeamAndName.mockResolvedValue(null);
      mockTeamParamRepository.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(mockTeamParamRepository.findByTeamAndName).toHaveBeenCalledWith({
        teamId: createDto.team,
        name: createDto.name,
      });
      expect(mockTeamParamRepository.create).toHaveBeenCalledWith({
        doc: {
          ...createDto,
          team: expect.any(Object), // Expect ObjectId conversion
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should create an openings param successfully', async () => {
      const createDto = {
        team: '507f1f77bcf86cd799439011',
        name: 'store-hours',
        paramType: 'OpeningsParam' as const,
        value: {
          dayOfWeek: 'monday' as const,
          openingHour: '09:00',
          closingHour: '18:00',
        },
      };

      const expectedResult = { ...createDto, _id: '507f1f77bcf86cd799439013' };

      mockTeamParamRepository.findByTeamAndName.mockResolvedValue(null);
      mockTeamParamRepository.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(mockTeamParamRepository.findByTeamAndName).toHaveBeenCalledWith({
        teamId: createDto.team,
        name: createDto.name,
      });
      expect(mockTeamParamRepository.create).toHaveBeenCalledWith({
        doc: {
          ...createDto,
          team: expect.any(Object), // Expect ObjectId conversion
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should create a closings param successfully', async () => {
      const createDto = {
        team: '507f1f77bcf86cd799439011',
        name: 'closing-hours',
        paramType: 'ClosingsParam' as const,
        value: {
          dayOfWeek: 'friday' as const,
          closingHour: '17:30',
        },
      };

      const expectedResult = { ...createDto, _id: '507f1f77bcf86cd799439014' };

      mockTeamParamRepository.findByTeamAndName.mockResolvedValue(null);
      mockTeamParamRepository.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(mockTeamParamRepository.findByTeamAndName).toHaveBeenCalledWith({
        teamId: createDto.team,
        name: createDto.name,
      });
      expect(mockTeamParamRepository.create).toHaveBeenCalledWith({
        doc: {
          ...createDto,
          team: expect.any(Object), // Expect ObjectId conversion
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if parameter name already exists', async () => {
      const createDto = {
        team: '507f1f77bcf86cd799439011',
        name: 'show-number',
        paramType: 'ShowNumberParam' as const,
        value: true,
      };

      const existingParam = { ...createDto, _id: '507f1f77bcf86cd799439012' };

      mockTeamParamRepository.findByTeamAndName.mockResolvedValue(
        existingParam,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTeamParamRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a team param', async () => {
      const id = '507f1f77bcf86cd799439012';
      const expectedResult = {
        _id: id,
        team: '507f1f77bcf86cd799439011',
        name: 'show-number',
        paramType: 'ShowNumberParam',
        value: true,
      };

      mockTeamParamRepository.findById.mockResolvedValue(expectedResult);

      const result = await service.findOne(id);

      expect(mockTeamParamRepository.findById).toHaveBeenCalledWith({
        id,
        options: { populate: [{ path: 'team' }] },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException if team param not found', async () => {
      const id = '507f1f77bcf86cd799439012';

      mockTeamParamRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByTeam', () => {
    it('should return team params for a team', async () => {
      const teamId = '507f1f77bcf86cd799439011';
      const expectedResult = [
        {
          _id: '507f1f77bcf86cd799439012',
          team: teamId,
          name: 'show-number',
          paramType: 'ShowNumberParam',
          value: true,
        },
      ];

      mockTeamParamRepository.findByTeam.mockResolvedValue(expectedResult);

      const result = await service.findByTeam(teamId);

      expect(mockTeamParamRepository.findByTeam).toHaveBeenCalledWith({
        teamId,
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
