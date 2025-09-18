import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamParam } from '../team-param.schema';

// Openings Parameter - object value with day of week, opening hour, and closing hour
@Schema()
export class OpeningsParam extends TeamParam {
  @Prop({
    required: true,
    type: {
      dayOfWeek: {
        type: String,
        enum: [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ],
        required: true,
      },
      openingHour: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format validation
      },
      closingHour: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format validation
      },
    },
  })
  value: {
    dayOfWeek: string;
    openingHour: string;
    closingHour: string;
  };
}

export const OpeningsParamSchema = SchemaFactory.createForClass(OpeningsParam);

export type OpeningsParamDocument = OpeningsParam & Document;
