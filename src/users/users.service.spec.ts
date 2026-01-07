import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UserRepository } from './users.repository';
import { RolesService } from '../roles/roles.service';
import { AwsS3Service } from '../aws/aws-s3.service';
import { MemberRepository } from '../members/member.repository';

const mockUsersRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRolesService = {
  findOne: jest.fn(),
  findById: jest.fn(),
};

const mockAwsS3Service = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
};

const mockMemberRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

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

  afterEach(() => {
    jest.clearAllMocks();
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
