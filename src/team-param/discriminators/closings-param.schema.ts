import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamParam } from '../team-param.schema';

// Closings Parameter - object value with day of week and closing hour
@Schema()
export class ClosingsParam extends TeamParam {
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
      closingHour: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format validation
      },
    },
  })
  value: {
    dayOfWeek: string;
    closingHour: string;
  };
}

export const ClosingsParamSchema = SchemaFactory.createForClass(ClosingsParam);

export type ClosingsParamDocument = ClosingsParam & Document;