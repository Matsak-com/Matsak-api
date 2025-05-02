import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { Role } from '../roles/role.schema';
import { Team } from '../teams/team.schema';

export type MemberDocument = Member & Document;

@Schema({ timestamps: true })
@Schema()
export class Member {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  team: Types.ObjectId;
}

export const MemberSchema = SchemaFactory.createForClass(Member);
