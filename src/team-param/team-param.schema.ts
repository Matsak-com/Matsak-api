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

  // paramType is automatically managed by discriminatorKey
  paramType: string;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const TeamParamSchema = SchemaFactory.createForClass(TeamParam);
