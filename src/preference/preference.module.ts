import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreferencesService } from './preference.service';
import { PreferencesController } from './preference.controller';
import { Preference, PreferenceSchema } from './preference.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Preference.name, 
        schema: PreferenceSchema,
      },
    ]),
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService], 
})
export class PreferenceModule {} 
