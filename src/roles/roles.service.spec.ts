import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';

const mockRolesRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: mockRolesRepository,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
