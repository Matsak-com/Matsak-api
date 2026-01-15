import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PreferencesService } from './preference.service';

// Mock mongoose model
const mockPreferenceModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
};

describe('PreferenceService', () => {
  let service: PreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: getModelToken('Preference'),
          useValue: mockPreferenceModel,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});