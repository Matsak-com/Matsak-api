import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { MembersRepository } from './members.repository';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

const mockMembersRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockUsersService = {
  createUser: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
};

const mockRolesService = {
  findOne: jest.fn(),
  findById: jest.fn(),
};

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: MembersRepository,
          useValue: mockMembersRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
