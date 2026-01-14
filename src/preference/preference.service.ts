import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Preference, PreferenceDocument } from './preference.schema';
import {
  CreatePreferenceDto,
  UpdatePreferenceDto,
  UpdateSpecificSettingDto,
  preferenceSettingsSchema,
  updatePreferenceSettingsSchema,
} from 'src/common/schemas/preference.schemas';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @InjectModel(Preference.name)
    private preferenceModel: Model<PreferenceDocument>,
  ) {}

  // Create
  async create(
    userId: string,
    createPreferenceDto: CreatePreferenceDto,
  ): Promise<Preference> {
    try {
      // Verify if preferences already exist for the user
      const existing = await this.preferenceModel.findOne({
        user: new Types.ObjectId(userId),
      });

      if (existing) {
        throw new ConflictException(
          'Des préférences existent déjà pour cet utilisateur',
        );
      }

      // Zod Validation 
      const validatedSettings = preferenceSettingsSchema.parse(
        createPreferenceDto.settings || {},
      );

      // create new preference
      const preference = new this.preferenceModel({
        user: new Types.ObjectId(userId),
        settings: validatedSettings,
      });

      return await preference.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'Des préférences existent déjà pour cet utilisateur',
        );
      }
      throw error;
    }
  }

  // Find or create
  async findOrCreate(userId: string): Promise<Preference> {
    let preference = await this.preferenceModel.findOne({
      user: new Types.ObjectId(userId),
    });

    if (!preference) {
      // default values
      const defaultSettings = preferenceSettingsSchema.parse({});
      preference = new this.preferenceModel({
        user: new Types.ObjectId(userId),
        settings: defaultSettings,
      });
      await preference.save();
    }

    return preference;
  }

  // Find user by ID
  async findOne(userId: string): Promise<Preference> {
    const preference = await this.preferenceModel
      .findOne({ user: new Types.ObjectId(userId) })
      .populate('user', 'name email')
      .lean()
      .exec();

    if (!preference) {
      throw new NotFoundException(
        `Aucune préférence trouvée pour l'utilisateur ${userId}`,
      );
    }

    return preference as Preference;
  }

  // update
  async update(
    userId: string,
    updatePreferenceDto: UpdatePreferenceDto,
  ): Promise<Preference> {
    // Valid the new settings
    const validatedSettings = updatePreferenceSettingsSchema.parse(
      updatePreferenceDto.settings || {},
    );

    // Object of updates
    const updateObj: Record<string, any> = {};
    Object.entries(validatedSettings).forEach(([key, value]) => {
      updateObj[`settings.${key}`] = value;
    });

    // Update with upsert (create if not exists)
    const updated = await this.preferenceModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $set: updateObj },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .populate('user', 'name email')
      .exec();

    return updated;
  }

  // update a specific setting
  async updateSpecificSetting(
    userId: string,
    setting: string,
    updateSettingDto: UpdateSpecificSettingDto,
  ): Promise<Preference> {
    // verify that the setting is valid
    const validSettings = Object.keys(updatePreferenceSettingsSchema.shape);
    if (!validSettings.includes(setting)) {
      throw new BadRequestException(`Paramètre invalide: ${setting}`);
    }

    const updated = await this.preferenceModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $set: { [`settings.${setting}`]: updateSettingDto.value } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(
        `Aucune préférence trouvée pour l'utilisateur ${userId}`,
      );
    }

    return updated;
  }

  // Delete
  async remove(userId: string): Promise<void> {
    const result = await this.preferenceModel
      .deleteOne({ user: new Types.ObjectId(userId) })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Aucune préférence trouvée pour l'utilisateur ${userId}`,
      );
    }
  }

  // Reset
  async resetToDefault(userId: string): Promise<Preference> {
    const defaultSettings = preferenceSettingsSchema.parse({});

    const updated = await this.preferenceModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $set: { settings: defaultSettings } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(
        `Aucune préférence trouvée pour l'utilisateur ${userId}`,
      );
    }

    return updated;
  }
}
