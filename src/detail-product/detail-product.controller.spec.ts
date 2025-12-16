import { Test, TestingModule } from '@nestjs/testing';
import { DetailProductController } from './detail-product.controller';
import { DetailProductService } from './detail-product.service';

const mockDetailProductService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DetailProductController', () => {
  let controller: DetailProductController;
  let service: DetailProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DetailProductController],
      providers: [
        {
          provide: DetailProductService,
          useValue: mockDetailProductService,
        },
      ],
    }).compile();

    controller = module.get<DetailProductController>(DetailProductController);
    service = module.get<DetailProductService>(DetailProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all detail products', async () => {
      const mockResults = [{ _id: '1' }, { _id: '2' }];
      mockDetailProductService.findAll.mockResolvedValue(mockResults);

      const result = await controller.findAll();

      expect(result).toEqual(mockResults);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
