import { Test, TestingModule } from '@nestjs/testing';
import { DetailProductService } from './detail-product.service';
import { DetailProductRepository } from './detail-product.repository';

const mockDetailProductRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('DetailProductService', () => {
  let service: DetailProductService;
  let repository: DetailProductRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DetailProductService,
        {
          provide: DetailProductRepository,
          useValue: mockDetailProductRepository,
        },
      ],
    }).compile();

    service = module.get<DetailProductService>(DetailProductService);
    repository = module.get<DetailProductRepository>(DetailProductRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a detail product', async () => {
      const mockDto = {
        categoryId: '507f1f77bcf86cd799439011',
        subcategoryId: '507f1f77bcf86cd799439012',
        description: 'Test product',
      };
      const mockResult = { _id: '123', ...mockDto };

      mockDetailProductRepository.create.mockResolvedValue(mockResult);

      const result = await service.create(mockDto as any);

      expect(result).toEqual(mockResult);
      expect(repository.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all detail products', async () => {
      const mockResults = [{ _id: '1' }, { _id: '2' }];
      mockDetailProductRepository.findAll.mockResolvedValue(mockResults);

      const result = await service.findAll();

      expect(result).toEqual(mockResults);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });
});
