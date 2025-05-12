import { Test, TestingModule } from '@nestjs/testing';
import { DetailProductController } from './detail-product.controller';
import { DetailProductService } from './detail-product.service';

describe('DetailProductController', () => {
  let controller: DetailProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DetailProductController],
      providers: [DetailProductService],
    }).compile();

    controller = module.get<DetailProductController>(DetailProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
