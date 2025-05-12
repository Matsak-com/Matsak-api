import { Test, TestingModule } from '@nestjs/testing';
import { ImageProductService } from './image-product.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImageProduct } from './image-product.schema';

// Mock des données et du modèle
const mockImageProduct = {
  _id: '1',
  url: 'http://example.com/image.png',
  filename: 'image.png',
  altText: 'Image for product',
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
      const createImageDto = {
        url: 'http://example.com/image.png',
        filename: 'image.png',
        altText: 'Image for product',
        type: 'product',
      };

      const result = await service.create(createImageDto);
      expect(result).toEqual(mockImageProduct);
      expect(model.save).toHaveBeenCalledWith(createImageDto);  // Vérifie que save a bien été appelé avec les bons paramètres
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

  describe('update', () => {
    it('should update an image product and return the updated one', async () => {
      const id = '1';
      const updateImageDto = { url: 'http://example.com/updated-image.png' };

      const result = await service.update(id, updateImageDto);
      expect(result).toEqual(mockImageProduct);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(id, updateImageDto, { new: true });
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
