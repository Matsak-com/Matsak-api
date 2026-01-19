import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UsePipes,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PreferencesService } from './preference.service';
import {
  createPreferenceSchema,
  updatePreferenceSchema,
  CreatePreferenceDto,
  UpdatePreferenceDto,
  UpdateSpecificSettingDto,
  getSettingValueSchema,
} from 'src/common/schemas/preference.schemas';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ZodError } from 'zod';
import { ERRORS } from 'src/common/errors';

@Controller('preference')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  // Create
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createPreferenceSchema))
  async create(
    @Request() req,
    @Body() createPreferenceDto: CreatePreferenceDto,
  ) {
    return this.preferencesService.create(req.user.userId, createPreferenceDto);
  }

  // My preferences
  @Get('my')
  async getMyPreferences(@Request() req) {
    return this.preferencesService.findOne(req.user.userId);
  }

  // Find or create
  @Get('my/or-create')
  async getOrCreateMyPreferences(@Request() req) {
    return this.preferencesService.findOrCreate(req.user.userId);
  }

  // Update
  @Put('my')
  @UsePipes(new ZodValidationPipe(updatePreferenceSchema))
  async updateMyPreferences(
    @Request() req,
    @Body() updatePreferenceDto: UpdatePreferenceDto,
  ) {
    return this.preferencesService.update(req.user.userId, updatePreferenceDto);
  }

  // Update a specific setting
  @Put('my/:setting')
  async updateSpecificSetting(
    @Request() req,
    @Param('setting') setting: string,
    @Body() updateSettingDto: UpdateSpecificSettingDto,
  ) {
    // Dynamic validation based on the setting
    try {
      const valueSchema = getSettingValueSchema(setting);
      const validatedValue = valueSchema.parse(updateSettingDto.value);

      // Call the service with the validated value
      return this.preferencesService.updateSpecificSetting(
        req.user.userId,
        setting,
        { value: validatedValue },
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        throw new BadRequestException({
          message: ERRORS.VALIDATION_FAILED,
          errors: errorMessages,
        });
      }
      throw new BadRequestException(ERRORS.VALIDATION_FAILED);
    }
  }

  // Reset
  @Post('my/reset')
  async resetMyPreferences(@Request() req) {
    return this.preferencesService.resetToDefault(req.user.userId);
  }

  // Delete
  @Delete('my')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyPreferences(@Request() req) {
    return this.preferencesService.remove(req.user.userId);
  }
}
