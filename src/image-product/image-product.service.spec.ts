import { Test, TestingModule } from '@nestjs/testing';
import { ImageProductService } from './image-product.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImageProduct } from './image-product.schema';
import { CreateImageProductDto } from './dto/create-image-product.dto';

// Mock des données et du modèle
const mockImageProduct = {
  _id: '1',
  url: 'http://example.com/image.png',
  filename: 'image.png',
  type: 'product',
};

const mockImageProductModel = {
  new: jest.fn().mockResolvedValue(mockImageProduct),
  constructor: jest.fn().mockResolvedValue(mockImageProduct),
  save: jest.fn().mockResolvedValue(mockImageProduct),
  find: jest.fn().mockResolvedValue([mockImageProduct]),
  findById: jest.fn().mockResolvedValue(mockImageProduct),
  findByIdAndUpdate: jest.fn().mockResolvedValue(mockImageProduct),
  findByIdAndDelete: jest.fn().mockResolvedValue(mockImageProduct),
};

describe('ImageProductService', () => {
  let service: ImageProductService;
  let model: Model<ImageProduct>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageProductService,
        {
          provide: getModelToken(ImageProduct.name),
          useValue: mockImageProductModel,
        },
      ],
    }).compile();

    service = module.get<ImageProductService>(ImageProductService);
    model = module.get<Model<ImageProduct>>(getModelToken(ImageProduct.name));
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
      // model is a Mongoose Model, cast to any to access mocked save
      expect((model as any).save).toHaveBeenCalledWith(createImageDto); // Vérifie que save a bien été appelé avec les bons paramètres
    });
  });

  describe('findAll', () => {
    it('should return an array of image products', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockImageProduct]);
      expect(model.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single image product by id', async () => {
      const id = '1';
      const result = await service.findOne(id);
      expect(result).toEqual(mockImageProduct);
      expect(model.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('findMany', () => {
    it('should return multiple image products by array of ids', async () => {
      const ids = ['1', '2', '3'];
      const mockMultipleImages = [
        { _id: '1', url: 'http://example.com/image1.png', filename: 'image1.png' },
        { _id: '2', url: 'http://example.com/image2.png', filename: 'image2.png' },
        { _id: '3', url: 'http://example.com/image3.png', filename: 'image3.png' },
      ];

      mockImageProductModel.find = jest.fn().mockResolvedValue(mockMultipleImages);

      const result = await service.findMany(ids);
      expect(result).toEqual(mockMultipleImages);
      expect(model.find).toHaveBeenCalled();
    });

    it('should return empty array when no ids provided', async () => {
      mockImageProductModel.find = jest.fn().mockResolvedValue([]);

      const result = await service.findMany([]);
      expect(result).toEqual([]);
      expect(model.find).toHaveBeenCalled();
    });

    it('should handle invalid ObjectId format gracefully', async () => {
      const invalidIds = ['invalid-id', '123'];
      
      // Mock findAll to throw error for invalid ObjectIds
      mockImageProductModel.find = jest.fn().mockRejectedValue(new Error('Invalid ObjectId'));

      await expect(service.findMany(invalidIds)).rejects.toThrow('Invalid ObjectId');
    });
  });

  describe('update', () => {
    it('should update an image product and return the updated one', async () => {
      const id = '1';
      const updateImageDto = { filename: 'updated-image.png' };

      const result = await service.update(id, updateImageDto);
      expect(result).toEqual(mockImageProduct);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(id, updateImageDto, {
        new: true,
      });
    });
  });

  describe('remove', () => {
    it('should delete an image product by id', async () => {
      const id = '1';
      const result = await service.remove(id);
      expect(result).toEqual(mockImageProduct);
      expect(model.findByIdAndDelete).toHaveBeenCalledWith(id);
    });
  });
});
