import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export type MemberDocument = Member & Document;

@Schema({ timestamps: true })
export class Member {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  team: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MemberStatus),
    default: MemberStatus.ACTIVE,
  })
  status: MemberStatus;

  @Prop({ type: Date })
  joinedAt: Date;

  @Prop({ type: Date })
  lastActiveAt?: Date;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: String })
  invitedBy?: Types.ObjectId;

  @Prop({ type: Date })
  invitedAt?: Date;

  @Prop({ type: String })
  inviteToken?: string;

  @Prop({ type: Date })
  inviteExpiresAt?: Date;

  @Prop({ type: String })
  notes?: string;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const MemberSchema = SchemaFactory.createForClass(Member);
