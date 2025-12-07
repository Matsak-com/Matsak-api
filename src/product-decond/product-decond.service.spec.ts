import { Test, TestingModule } from '@nestjs/testing';
import { ProductDecondService } from './product-decond.service';
import { ProductDecondRepository } from './product-decond.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { ImageProductRepository } from '../image-product/image-product.repository';
import { NotFoundException } from '@nestjs/common';

const mockProductDecondRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDetailProductRepository = {
  findById: jest.fn(),
};

const mockImageProductRepository = {
  findById: jest.fn(),
};

describe('ProductDecondService', () => {
  let service: ProductDecondService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductDecondService,
        {
          provide: ProductDecondRepository,
          useValue: mockProductDecondRepository,
        },
        {
          provide: DetailProductRepository,
          useValue: mockDetailProductRepository,
        },
        {
          provide: ImageProductRepository,
          useValue: mockImageProductRepository,
        },
      ],
    }).compile();

    service = module.get<ProductDecondService>(ProductDecondService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product decond', async () => {
      const mockData = {
        detailProduct: '507f1f77bcf86cd799439011',
        image: '507f1f77bcf86cd799439012',
      };

      mockDetailProductRepository.findById.mockResolvedValue({ _id: mockData.detailProduct });
      mockImageProductRepository.findById.mockResolvedValue({ _id: mockData.image });
      mockProductDecondRepository.create.mockResolvedValue(mockData);

      const result = await service.create(mockData as any);

      expect(result).toEqual(mockData);
      expect(mockDetailProductRepository.findById).toHaveBeenCalled();
      expect(mockImageProductRepository.findById).toHaveBeenCalled();
      expect(mockProductDecondRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if detail product not found', async () => {
      const mockData = {
        detailProduct: '507f1f77bcf86cd799439011',
        image: '507f1f77bcf86cd799439012',
      };

      mockDetailProductRepository.findById.mockResolvedValue(null);

      await expect(service.create(mockData as any)).rejects.toThrow(NotFoundException);
    });
  });
});
