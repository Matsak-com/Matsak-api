import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PreferencesService } from './preference.service';
import { 
  NotFoundException, 
  ConflictException,
} from '@nestjs/common';

const mockUserId = '507f1f77bcf86cd799439011';
const mockObjectId = new Types.ObjectId(mockUserId);

const mockPreference = {
    _id: '64a1b2c3d4e5f67890123456',
    id: '64a1b2c3d4e5f67890123456',
    user: mockObjectId,
    settings: {
      theme: 'light',
      sidebarLayout: false,
      rtlLayout: false,
      boxedLayout: false,
      miniSidebar: false,
      borderCard: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

// Mock Mongoose Model
class MockPreferenceModel {
  static findOne = jest.fn();
  static findOneAndUpdate = jest.fn();
  static deleteOne = jest.fn();
  static create = jest.fn();
  
  constructor(public data: any) {}
  
  save() {
    return Promise.resolve(mockPreference);
  }
}

// Mock schema validation
jest.mock('src/common/schemas/preference.schemas', () => ({
  preferenceSettingsSchema: {
    parse: jest.fn((data) => data || {
      theme: 'light',
      sidebarLayout: false,
      rtlLayout: false,
      boxedLayout: false,
      miniSidebar: false,
      borderCard: false,
    }),
    shape: {
      theme: true,
      sidebarLayout: true,
      rtlLayout: true,
      boxedLayout: true,
      miniSidebar: true,
      borderCard: true,
    },
  },
  updatePreferenceSettingsSchema: {
    parse: jest.fn((data) => data || {}),
    shape: {
      theme: true,
      sidebarLayout: true,
      rtlLayout: true,
      boxedLayout: true,
      miniSidebar: true,
      borderCard: true,
    },
  },
  CreatePreferenceDto: class {},
  UpdatePreferenceDto: class {},
  UpdateSpecificSettingDto: class {},
}));

describe('PreferencesService', () => {
  let service: PreferencesService;
  let mockPreferenceModelInstance: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    MockPreferenceModel.findOne.mockReset();
    MockPreferenceModel.findOneAndUpdate.mockReset();
    MockPreferenceModel.deleteOne.mockReset();
    MockPreferenceModel.create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: getModelToken('Preference'),
          useValue: MockPreferenceModel,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    
    // Get the instance for mocking constructor
    mockPreferenceModelInstance = (service as any).preferenceModel;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // BASICS
  describe('basics', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // CREATE
  describe('create', () => {
    const createDto = {
      settings: {
        theme: 'BLUE_THEME' as const,
        sidebarLayout: true,
      },
    };

    it('should successfully create preferences for new user', async () => {
      // Mock: no existing preferences
      MockPreferenceModel.findOne.mockResolvedValue(null);
      
      // Mock schema validation
      const { preferenceSettingsSchema } = require('src/common/schemas/preference.schemas');
      preferenceSettingsSchema.parse.mockReturnValue(createDto.settings);
      
      // Mock the save method to return mockPreference
      const mockSaveInstance = {
        save: jest.fn().mockResolvedValue(mockPreference),
      };
      
      // Mock the constructor to return our instance
      jest.spyOn(MockPreferenceModel.prototype, 'save').mockResolvedValue(mockPreference);

      const result = await service.create(mockUserId, createDto);

      expect(MockPreferenceModel.findOne).toHaveBeenCalledWith({
        user: mockObjectId,
      });
    });

    it('should throw ConflictException when preferences already exist', async () => {
      MockPreferenceModel.findOne.mockResolvedValue(mockPreference);

      await expect(service.create(mockUserId, createDto))
        .rejects.toThrow(ConflictException);
    });

    it('should handle duplicate key error (code 11000)', async () => {
      MockPreferenceModel.findOne.mockResolvedValue(null);
      
      const { preferenceSettingsSchema } = require('src/common/schemas/preference.schemas');
      preferenceSettingsSchema.parse.mockReturnValue(createDto.settings);
      
      const error = new Error('Duplicate key');
      (error as any).code = 11000;
      
      jest.spyOn(MockPreferenceModel.prototype, 'save').mockRejectedValue(error);

      await expect(service.create(mockUserId, createDto))
        .rejects.toThrow(ConflictException);
    });
  });

  // FIND OR CREATE
  describe('findOrCreate', () => {
    it('should return existing preferences', async () => {
      MockPreferenceModel.findOne.mockResolvedValue(mockPreference);

      const result = await service.findOrCreate(mockUserId);

      expect(result).toEqual(mockPreference);
      expect(MockPreferenceModel.findOne).toHaveBeenCalledWith({
        user: mockObjectId,
      });
    });

    it('should create new preferences with defaults when none exist', async () => {
      MockPreferenceModel.findOne.mockResolvedValue(null);
      
      const { preferenceSettingsSchema } = require('src/common/schemas/preference.schemas');
      const defaultSettings = preferenceSettingsSchema.parse({});
      
      jest.spyOn(MockPreferenceModel.prototype, 'save').mockResolvedValue(mockPreference);

      const result = await service.findOrCreate(mockUserId);

      expect(MockPreferenceModel.prototype.save).toHaveBeenCalled();
    });
  });

  // FIND ONE
  describe('findOne', () => {
    it('should return user preferences when found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPreference),
      };
      
      MockPreferenceModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findOne(mockUserId);

      expect(result).toEqual(mockPreference);
    });

    it('should throw NotFoundException when preferences not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      
      MockPreferenceModel.findOne.mockReturnValue(mockQuery);

      await expect(service.findOne(mockUserId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // UPDATE
  describe('update', () => {
    const updateDto = {
      settings: {
        theme: 'BLUE_THEME' as const,
        sidebarLayout: true,
      },
    };

    it('should update preferences with validation', async () => {
      const { updatePreferenceSettingsSchema } = require('src/common/schemas/preference.schemas');
      updatePreferenceSettingsSchema.parse.mockReturnValue(updateDto.settings);
      
      const updatedPreference = {
        ...mockPreference,
        settings: { ...mockPreference.settings, ...updateDto.settings },
      };
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedPreference),
      };
      
      MockPreferenceModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.update(mockUserId, updateDto);

      expect(result.settings.theme).toBe('BLUE_THEME');
      expect(MockPreferenceModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  // UPDATE SPECIFIC SETTING
  describe('updateSpecificSetting', () => {
    const updateSettingDto = {
      value: 'dark',
    };

    it('should update a specific valid setting', async () => {
      const updatedPreference = {
        ...mockPreference,
        settings: { ...mockPreference.settings, theme: 'dark' },
      };
      
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(updatedPreference),
      };
      
      MockPreferenceModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.updateSpecificSetting(
        mockUserId, 
        'theme', 
        updateSettingDto
      );

      expect(result.settings.theme).toBe('dark');
    });
  });

  // REMOVE
  describe('remove', () => {
    it('should delete user preferences', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };
      
      MockPreferenceModel.deleteOne.mockReturnValue(mockQuery);

      await service.remove(mockUserId);

      expect(MockPreferenceModel.deleteOne).toHaveBeenCalledWith({
        user: mockObjectId,
      });
    });

    it('should throw NotFoundException when nothing deleted', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };
      
      MockPreferenceModel.deleteOne.mockReturnValue(mockQuery);

      await expect(service.remove(mockUserId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // RESET TO DEFAULT
  describe('resetToDefault', () => {
    it('should reset settings to default values', async () => {
      const { preferenceSettingsSchema } = require('src/common/schemas/preference.schemas');
      const defaultSettings = preferenceSettingsSchema.parse({});
      
      const resetPreference = {
        ...mockPreference,
        settings: defaultSettings,
      };
      
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(resetPreference),
      };
      
      MockPreferenceModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.resetToDefault(mockUserId);

      expect(result.settings).toEqual(defaultSettings);
    });
  });
});