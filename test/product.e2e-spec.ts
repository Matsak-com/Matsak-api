import request from 'supertest';
import path from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
});

afterAll(async () => {
  if (app) await app.close();
});

describe('Products (e2e) - productImageFile upload', () => {
  it('creates product with new payload structure', async () => {
    const detailData = { 
      team: '68c5948004428e915dbbe7a2',
      name: 'Paracetamol 500g', 
      description: '<p></p>',
      composition: '',
      isRepackaged: false,
      form: '',
      indications: '',
      contraindications: '',
      precautions: '',
      sideEffects: '',
      expirationDate: '2027-08-25'
    };

    const res = await request(app.getHttpServer())
      .post('/products')
      .field('detailData', JSON.stringify(detailData))
      .field('categoryId', '68cab78504d0dddc25e17ccc')
      .field('price', '15000')
      .field('discountType', 'no-discount')
      .field('discountValue', '0')
      .field('currency', 'MGA')
      .attach(
        'productImage',
        path.join(__dirname, 'fixtures', 'test-image.jpg'),
        'test-image.jpg',
      )
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.basePrice).toBe(15000);
    expect(res.body.currency).toBe('MGA');
  }, 20000);
});
