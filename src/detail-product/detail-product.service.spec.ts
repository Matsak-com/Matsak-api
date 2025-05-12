import { Test, TestingModule } from '@nestjs/testing';
import { DetailProductService } from './detail-product.service';

describe('DetailProductService', () => {
  let service: DetailProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DetailProductService],
    }).compile();

    service = module.get<DetailProductService>(DetailProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
