import { Test, TestingModule } from '@nestjs/testing';
import { ImageProductService } from './image-product.service';
import { ImageProductRepository } from './image-product.repository';
import { CreateImageProductDto } from './dto/create-image-product.dto';

// Mock des données et du modèle
const mockImageProduct = {
  _id: '1',
  url: 'http://example.com/image.png',
  filename: 'image.png',
  type: 'product',
  data: 'base64string',
};

const mockImageProductRepository = {
  create: jest.fn().mockResolvedValue(mockImageProduct),
  findAll: jest.fn().mockResolvedValue([mockImageProduct]),
  findById: jest.fn().mockResolvedValue(mockImageProduct),
  update: jest.fn().mockResolvedValue(mockImageProduct),
  delete: jest.fn().mockResolvedValue(mockImageProduct),
};

describe('ImageProductService', () => {
  let service: ImageProductService;
  let repository: ImageProductRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageProductService,
        {
          provide: ImageProductRepository,
          useValue: mockImageProductRepository,
        },
      ],
    }).compile();

    service = module.get<ImageProductService>(ImageProductService);
    repository = module.get<ImageProductRepository>(ImageProductRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an image product', async () => {
      const createImageDto: CreateImageProductDto = {
        filename: 'test-image.jpg',
      };

      const result = await service.create(createImageDto);
      expect(result).toEqual(mockImageProduct);
      expect(repository.create).toHaveBeenCalledWith(createImageDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of image products', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockImageProduct]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single image product by id', async () => {
      const id = '1';
      const result = await service.findOne(id);
      expect(result).toEqual(mockImageProduct);
      expect(repository.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('findMany', () => {
    it('should return multiple image products by array of ids', async () => {
      const ids = ['1', '2', '3'];
      const mockMultipleImages = [
        {
          _id: '1',
          url: 'http://example.com/image1.png',
          filename: 'image1.png',
          data: 'base64',
        },
        {
          _id: '2',
          url: 'http://example.com/image2.png',
          filename: 'image2.png',
          data: 'base64',
        },
        {
          _id: '3',
          url: 'http://example.com/image3.png',
          filename: 'image3.png',
          data: 'base64',
        },
      ];

      mockImageProductRepository.findAll = jest
        .fn()
        .mockResolvedValue(mockMultipleImages);

      const result = await service.findMany(ids);
      expect(result).toEqual(mockMultipleImages);
      expect(repository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no ids provided', async () => {
      mockImageProductRepository.findAll = jest.fn().mockResolvedValue([]);

      const result = await service.findMany([]);
      expect(result).toEqual([]);
      expect(repository.findAll).toHaveBeenCalled();
    });

    it('should handle invalid ObjectId format gracefully', async () => {
      const invalidIds = ['invalid-id', '123'];

      mockImageProductRepository.findAll = jest
        .fn()
        .mockRejectedValue(new Error('Invalid ObjectId'));

      await expect(service.findMany(invalidIds)).rejects.toThrow(
        'Invalid ObjectId',
      );
    });
  });

  describe('update', () => {
    it('should update an image product and return the updated one', async () => {
      const id = '1';
      const updateImageDto = { filename: 'updated-image.png' };

      const result = await service.update(id, updateImageDto);
      expect(result).toEqual(mockImageProduct);
      expect(repository.update).toHaveBeenCalledWith(id, updateImageDto);
    });
  });

  describe('remove', () => {
    it('should delete an image product by id', async () => {
      const id = '1';
      const result = await service.remove(id);
      expect(result).toEqual(mockImageProduct);
      expect(repository.delete).toHaveBeenCalledWith(id);
    });
  });
});
