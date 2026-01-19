import {
  Injectable,
  NotFoundException,
  ConflictException,
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
  validateMergedSettings,
  getSettingValueSchema,
} from 'src/common/schemas/preference.schemas';

@Injectable()
export class PreferencesService {
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

      // Create new preference
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
      // Default values
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

  // Update preferences
  async update(
    userId: string,
    updatePreferenceDto: UpdatePreferenceDto,
  ): Promise<Preference> {
    // 1. Validate the update fields
    const validatedUpdate = updatePreferenceSettingsSchema.parse(
      updatePreferenceDto.settings || {},
    );

    // 2. Get current preferences
    const currentPreference = await this.preferenceModel
      .findOne({ user: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!currentPreference) {
      throw new NotFoundException(
        `Aucune préférence trouvée pour l'utilisateur ${userId}`,
      );
    }

    // 3. Merge current settings with updates
    const mergedSettings = {
      ...currentPreference.settings,
      ...validatedUpdate,
    };

    // 4. Validate merged settings to ensure no constraint violations
    const validatedMergedSettings = validateMergedSettings(mergedSettings);

    // 5. Update with validated merged settings
    const updated = await this.preferenceModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $set: { settings: validatedMergedSettings } },
        { new: true, runValidators: true },
      )
      .populate('user', 'name email')
      .exec();

    if (!updated) {
      throw new NotFoundException('Échec de la mise à jour des préférences');
    }

    return updated;
  }

  // Update a specific setting
  async updateSpecificSetting(
    userId: string,
    setting: string,
    updateSettingDto: UpdateSpecificSettingDto,
  ): Promise<Preference> {
    // 1. Validate that the setting is valid and get its schema
    const valueSchema = getSettingValueSchema(setting);
    const validatedValue = valueSchema.parse(updateSettingDto.value);

    // 2. Get current preferences
    const currentPreference = await this.preferenceModel
      .findOne({ user: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!currentPreference) {
      throw new NotFoundException(
        `Aucune préférence trouvée pour l'utilisateur ${userId}`,
      );
    }

    // 3. Create merged settings with the updated value
    const mergedSettings = {
      ...currentPreference.settings,
      [setting]: validatedValue,
    };

    // 4. Validate merged settings to ensure no constraint violations
    const validatedMergedSettings = validateMergedSettings(mergedSettings);

    // 5. Update with validated merged settings
    const updated = await this.preferenceModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $set: { settings: validatedMergedSettings } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Échec de la mise à jour du paramètre');
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
