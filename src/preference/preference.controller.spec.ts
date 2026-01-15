import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesController } from './preference.controller';
import { PreferencesService } from './preference.service';

// mock service
const mockPreferencesService = {
  findOne: jest.fn(),
  createOrUpdate: jest.fn(),
};

describe('PreferencesController', () => {
  let controller: PreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreferencesController],
      providers: [
        {
          provide: PreferencesService,
          useValue: mockPreferencesService,
        },
      ],
    }).compile();

    controller = module.get<PreferencesController>(PreferencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});