import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PreferencesService } from './preference.service';
import { Preference } from './preference.schema';
import { NotFoundException, ConflictException } from '@nestjs/common';

/* MOCK ZOD SCHEMAS */
import {
  preferenceSettingsSchema,
  updatePreferenceSettingsSchema,
  getSettingValueSchema,
  validateMergedSettings,
} from 'src/common/schemas/preference.schemas';

jest.mock('src/common/schemas/preference.schemas', () => ({
  preferenceSettingsSchema: {
    parse: jest.fn(),
  },
  updatePreferenceSettingsSchema: {
    parse: jest.fn(),
  },
  getSettingValueSchema: jest.fn(),
  validateMergedSettings: jest.fn(),
}));

/* MOCK DATA */
type ThemeType =
  | 'BLUE_THEME'
  | 'AQUA_THEME'
  | 'PURPLE_THEME'
  | 'GREEN_THEME'
  | 'CYAN_THEME'
  | 'ORANGE_THEME'
  | 'DARK_BLUE_THEME'
  | 'DARK_AQUA_THEME'
  | 'DARK_PURPLE_THEME'
  | 'DARK_GREEN_THEME'
  | 'DARK_CYAN_THEME'
  | 'DARK_ORANGE_THEME';

const mockDefaultSettings = {
  theme: 'BLUE_THEME' as ThemeType,
  sidebarLayout: false,
  rtlLayout: false,
  boxedLayout: false,
  miniSidebar: false,
  borderCard: false,
};

const mockUserId = '507f1f77bcf86cd799439011';
const mockObjectId = new Types.ObjectId(mockUserId);

const mockPreference = {
  _id: new Types.ObjectId(),
  user: mockObjectId,
  settings: mockDefaultSettings,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/* MOCK MODEL MONGOOSE */
type MockModelType = jest.Mock & {
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
  deleteOne: jest.Mock;
};

const createMockModel = (): MockModelType => {
  const model: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: mockPreference._id }),
  }));

  model.findOne = jest.fn();
  model.findOneAndUpdate = jest.fn();
  model.deleteOne = jest.fn();

  return model as MockModelType;
};

/* TESTS */
describe('PreferencesService', () => {
  let service: PreferencesService;
  let mockPreferenceModel: MockModelType;

  beforeEach(async () => {
    mockPreferenceModel = createMockModel();

    (preferenceSettingsSchema.parse as jest.Mock).mockImplementation(
      (data) => ({ ...mockDefaultSettings, ...data }),
    );

    (updatePreferenceSettingsSchema.parse as jest.Mock).mockImplementation(
      (data) => data || {},
    );

    (validateMergedSettings as jest.Mock).mockImplementation((data) => data);

    (getSettingValueSchema as jest.Mock).mockImplementation(() => ({
      parse: jest.fn((v) => v),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: getModelToken(Preference.name),
          useValue: mockPreferenceModel,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* CREATE */
  describe('create', () => {
    it('should create preferences', async () => {
      mockPreferenceModel.findOne.mockResolvedValue(null);

      const instance = {
        save: jest.fn().mockResolvedValue(mockPreference),
      };
      mockPreferenceModel.mockImplementationOnce(() => instance);

      const result = await service.create(mockUserId, {
        settings: { theme: 'BLUE_THEME' },
      });

      expect(preferenceSettingsSchema.parse).toHaveBeenCalled();
      expect(instance.save).toHaveBeenCalled();
      expect(result).toEqual(mockPreference);
    });

    it('should throw ConflictException if already exists', async () => {
      mockPreferenceModel.findOne.mockResolvedValue(mockPreference);

      await expect(
        service.create(mockUserId, { settings: {} }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle duplicate key error', async () => {
      mockPreferenceModel.findOne.mockResolvedValue(null);

      const instance = {
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      };
      mockPreferenceModel.mockImplementationOnce(() => instance);

      await expect(
        service.create(mockUserId, { settings: {} }),
      ).rejects.toThrow(ConflictException);
    });
  });

  /* FIND OR CREATE */
  describe('findOrCreate', () => {
    it('should return existing preference', async () => {
      mockPreferenceModel.findOne.mockResolvedValue(mockPreference);

      const result = await service.findOrCreate(mockUserId);
      expect(result).toEqual(mockPreference);
    });

    it('should create preference if none exists', async () => {
      mockPreferenceModel.findOne.mockResolvedValue(null);

      const instance = {
        user: mockObjectId,
        settings: mockDefaultSettings,
        save: jest.fn().mockResolvedValue(mockPreference),
      };

      mockPreferenceModel.mockImplementationOnce(() => instance);

      const result = await service.findOrCreate(mockUserId);

      expect(preferenceSettingsSchema.parse).toHaveBeenCalledWith({});
      expect(instance.save).toHaveBeenCalled();

      expect(result).toBe(instance);
      expect(result.settings).toEqual(mockDefaultSettings);
    });
  });

  /* FIND ONE */
  describe('findOne', () => {
    it('should return preference', async () => {
      mockPreferenceModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPreference),
      });

      const result = await service.findOne(mockUserId);
      expect(result).toEqual(mockPreference);
    });

    it('should throw NotFoundException', async () => {
      mockPreferenceModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* UPDATE */
  describe('update', () => {
    it('should update preferences', async () => {
      mockPreferenceModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPreference),
      });

      mockPreferenceModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPreference),
      });

      const result = await service.update(mockUserId, {
        settings: { sidebarLayout: true },
      });

      expect(updatePreferenceSettingsSchema.parse).toHaveBeenCalled();
      expect(validateMergedSettings).toHaveBeenCalled();
      expect(result).toEqual(mockPreference);
    });

    it('should throw NotFoundException if missing', async () => {
      mockPreferenceModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(mockUserId, { settings: {} }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* UPDATE SPECIFIC SETTING */
  describe('updateSpecificSetting', () => {
    it('should update one setting', async () => {
      mockPreferenceModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPreference),
      });

      mockPreferenceModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPreference),
      });

      const result = await service.updateSpecificSetting(mockUserId, 'theme', {
        value: 'BLUE_THEME',
      });

      expect(getSettingValueSchema).toHaveBeenCalledWith('theme');
      expect(validateMergedSettings).toHaveBeenCalled();
      expect(result).toEqual(mockPreference);
    });

    it('should throw NotFoundException', async () => {
      mockPreferenceModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateSpecificSetting(mockUserId, 'theme', {
          value: 'BLUE_THEME',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* REMOVE */
  describe('remove', () => {
    it('should delete preferences', async () => {
      mockPreferenceModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      await service.remove(mockUserId);
      expect(mockPreferenceModel.deleteOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException', async () => {
      mockPreferenceModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await expect(service.remove(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* RESET */
  describe('resetToDefault', () => {
    it('should reset settings', async () => {
      mockPreferenceModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPreference),
      });

      const result = await service.resetToDefault(mockUserId);
      expect(preferenceSettingsSchema.parse).toHaveBeenCalledWith({});
      expect(result).toEqual(mockPreference);
    });

    it('should throw NotFoundException', async () => {
      mockPreferenceModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.resetToDefault(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
