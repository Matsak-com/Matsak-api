import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamParam } from '../team-param.schema';

// Openings Parameter - object value with day of week, opening hour, and closing hour
@Schema()
export class OpeningsParam extends TeamParam {
  @Prop({
    required: true,
    type: [
      {
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
        isOpen: { type: Boolean, required: true },
        openTime: {
          type: String,
          required: true,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        },
        closeTime: {
          type: String,
          required: true,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        },
        breakStartTime: {
          type: String,
          required: false,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        },
        breakEndTime: {
          type: String,
          required: false,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        },
      },
    ],
  })
  value: Array<{
    dayOfWeek: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    breakStartTime?: string;
    breakEndTime?: string;
  }>;
}

export const OpeningsParamSchema = SchemaFactory.createForClass(OpeningsParam);

export type OpeningsParamDocument = OpeningsParam & Document;
