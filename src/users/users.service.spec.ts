import { Test, TestingModule } from '@nestjs/testing';
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
        {
          provide: AwsS3Service,
          useValue: mockAwsS3Service,
        },
        {
          provide: MemberRepository,
          useValue: mockMemberRepository,
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
      const mockUser = {
        _id: '1',
        email: 'test@test.com',
        firstName: 'Test',
        avatarFileKey: null,
        toObject: jest.fn().mockReturnValue({
          _id: '1',
          email: 'test@test.com',
          firstName: 'Test',
          avatarFileKey: null,
        }),
      };
      const mockUsers = [mockUser];
      mockUsersRepository.findAll.mockResolvedValue(mockUsers);
      mockAwsS3Service.getFileUrl.mockResolvedValue('');

      const result = await service.getUsers();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('email', 'test@test.com');
      expect(result[0]).toHaveProperty('avatarUrl');
      expect(mockUsersRepository.findAll).toHaveBeenCalled();
    });
  });
});
