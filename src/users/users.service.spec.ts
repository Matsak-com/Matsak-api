import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { RolesService } from '../roles/roles.service';
import { AwsS3Service } from '../aws/aws-s3.service';

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

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
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
      const mockUsers = [{ _id: '1', email: 'test@test.com' }];
      mockUsersRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.getUsers();

      expect(result).toEqual(mockUsers);
      expect(mockUsersRepository.findAll).toHaveBeenCalled();
    });
  });
});
