import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamParam } from '../team-param.schema';

// Show Number Parameter - boolean value
@Schema()
export class ShowNumberParam extends TeamParam {
  @Prop({ required: true, type: Boolean })
  value: boolean;
}

export const ShowNumberParamSchema =
  SchemaFactory.createForClass(ShowNumberParam);

export type ShowNumberParamDocument = ShowNumberParam & Document;
