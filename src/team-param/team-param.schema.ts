import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Team } from '../teams/team.schema';

export type TeamParamDocument = TeamParam & Document;

@Schema({
  timestamps: true,
  discriminatorKey: 'paramType',
  collection: 'teamparams',
})
export class TeamParam extends Document {
  @Prop({ type: Types.ObjectId, ref: Team.name, required: true })
  team: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  paramType: string;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const TeamParamSchema = SchemaFactory.createForClass(TeamParam);

// Show Number Parameter - boolean value
@Schema()
export class ShowNumberParam extends TeamParam {
  @Prop({ required: true, type: Boolean })
  value: boolean;
}

export const ShowNumberParamSchema =
  SchemaFactory.createForClass(ShowNumberParam);

// Show Email Parameter - boolean value
@Schema()
export class ShowEmailParam extends TeamParam {
  @Prop({ required: true, type: Boolean })
  value: boolean;
}

export const ShowEmailParamSchema =
  SchemaFactory.createForClass(ShowEmailParam);

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

// Export all document types
export type ShowNumberParamDocument = ShowNumberParam & Document;
export type ShowEmailParamDocument = ShowEmailParam & Document;
export type CurrencyParamDocument = CurrencyParam & Document;
