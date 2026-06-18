import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AdStatus, AdPlacement, AdType } from '../enums';

export type AdDocument = Ad & Document;

@Schema({ timestamps: true })
export class Ad {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: null })
  description: string | null;

  @Prop({ trim: true, default: null })
  imageUrl: string | null;

  @Prop({ trim: true, default: null })
  targetUrl: string | null;

  @Prop({ required: true, enum: Object.values(AdPlacement), index: true })
  placement: AdPlacement;

  @Prop({ required: true, enum: Object.values(AdType) })
  type: AdType;

  @Prop({
    required: true,
    enum: Object.values(AdStatus),
    default: AdStatus.INACTIVE,
    index: true,
  })
  status: AdStatus;

  @Prop({ type: Number, default: 10, min: 1 })
  priority: number;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ type: Number, default: 0, min: 0 })
  impressions: number;

  @Prop({ type: Number, default: 0, min: 0 })
  clicks: number;

  @Prop({ type: Types.ObjectId, ref: 'Team', default: null, index: true })
  teamId: Types.ObjectId | null;

  /** S3 key or local path used to delete the file when replaced/deleted */
  @Prop({ type: String, default: null })
  imageFileKey: string | null;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export const AdSchema = SchemaFactory.createForClass(Ad);

AdSchema.index({ priority: 1, createdAt: -1 });
AdSchema.index({ status: 1, placement: 1 });
