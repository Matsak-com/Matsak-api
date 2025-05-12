import { Test, TestingModule } from '@nestjs/testing';
import { ProductDecondService } from './product-decond.service';

describe('ProductDecondService', () => {
  let service: ProductDecondService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductDecondService],
    }).compile();

    service = module.get<ProductDecondService>(ProductDecondService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
