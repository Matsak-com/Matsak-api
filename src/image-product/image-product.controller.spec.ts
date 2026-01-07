import { Test, TestingModule } from '@nestjs/testing';
import { ImageProductController } from './image-product.controller';
import { ImageProductService } from './image-product.service';

const mockImageProductService = {
  upload: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ImageProductController', () => {
  let controller: ImageProductController;
  let service: ImageProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageProductController],
      providers: [
        {
          provide: ImageProductService,
          useValue: mockImageProductService,
        },
      ],
    }).compile();

    controller = module.get<ImageProductController>(ImageProductController);
    service = module.get<ImageProductService>(ImageProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all image products', async () => {
      const mockResults = [{ _id: '1', filename: 'image.jpg' }];
      mockImageProductService.findAll.mockResolvedValue(mockResults);

      const result = await controller.findAll();

      expect(result).toEqual(mockResults);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
