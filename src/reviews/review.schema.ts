import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Team } from '../teams/team.schema';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, required: true, minlength: 10, maxlength: 2000 })
  content: string;

  @Prop({
    type: String,
    enum: Object.values(ReviewStatus),
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Team.name,
    required: true,
    index: true,
  })
  teamId: Types.ObjectId;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index(
  { userId: 1, teamId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [ReviewStatus.PENDING, ReviewStatus.APPROVED] },
      deleted_at: { $exists: false },
    },
  },
);
