import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  // Créez des mocks pour toutes les dépendances
  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockAwsS3Service = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  const mockMemberRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'AwsS3Service',
          useValue: mockAwsS3Service,
        },
        {
          provide: 'MemberRepository',
          useValue: mockMemberRepository,
        },
        {
          provide: getModelToken('User'), // Pour Mongoose
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const expectedUsers = [{ id: 1, name: 'Test User' }];
      mockUserRepository.find.mockResolvedValue(expectedUsers);

      const result = await service.getUsers();

      expect(result).toEqual(expectedUsers);
      expect(mockUserRepository.find).toHaveBeenCalled();
    });
  });
});