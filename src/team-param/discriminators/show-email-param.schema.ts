import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamParam } from '../team-param.schema';

// Show Email Parameter - boolean value
@Schema()
export class ShowEmailParam extends TeamParam {
  @Prop({ required: true, type: Boolean })
  value: boolean;
}

export const ShowEmailParamSchema =
  SchemaFactory.createForClass(ShowEmailParam);

export type ShowEmailParamDocument = ShowEmailParam & Document;
