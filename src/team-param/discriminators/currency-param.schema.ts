import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamParam } from '../team-param.schema';

// Currency Parameter - string value
@Schema()
export class CurrencyParam extends TeamParam {
  @Prop({
    required: true,
    type: String,
    enum: [
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'CAD',
      'AUD',
      'CHF',
      'CNY',
      'MGA',
      'XOF',
    ],
    default: 'USD',
  })
  value: string;
}

export const CurrencyParamSchema = SchemaFactory.createForClass(CurrencyParam);

export type CurrencyParamDocument = CurrencyParam & Document;
