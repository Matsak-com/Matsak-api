import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UserRepository } from './users.repository';
import { AwsS3Service } from '../aws/aws-s3.service';
import { MemberRepository } from '../members/member.repository';
import { User } from './user.schema';

describe('UsersService', () => {
  let service: UsersService;

  // Créez des mocks pour toutes les dépendances
  const mockUserRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockAwsS3Service = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const mockMemberRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
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
          provide: UserRepository, // ✅ Utilisez la classe directement
          useValue: mockUserRepository,
        },
        {
          provide: AwsS3Service, // ✅ Utilisez la classe directement
          useValue: mockAwsS3Service,
        },
        {
          provide: MemberRepository, // ✅ Utilisez la classe directement
          useValue: mockMemberRepository,
        },
        {
          provide: getModelToken(User.name), // ✅ Pour Mongoose
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
      const mockUsers = [
        {
          _id: '123',
          email: 'test@example.com',
          firstName: 'Test',
          avatarFileKey: null,
          toObject: jest.fn().mockReturnThis(),
        },
      ];

      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.getUsers();

      expect(result).toBeDefined();
      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        filter: {},
        options: {
          projection: { _id: 1, email: 1, firstName: 1, avatarFileKey: 1 },
        },
      });
    });
  });
});