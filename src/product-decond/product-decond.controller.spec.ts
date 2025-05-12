import { Test, TestingModule } from '@nestjs/testing';
import { ProductDecondController } from './product-decond.controller';

describe('ProductDecondController', () => {
  let controller: ProductDecondController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductDecondController],
    }).compile();

    controller = module.get<ProductDecondController>(ProductDecondController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
