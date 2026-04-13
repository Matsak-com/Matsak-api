import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PricingRuleDocument = PricingRule & Document;

export enum PricingRuleType {
  DELIVERY = 'DELIVERY',
  SERVICE = 'SERVICE',
  HIGH_DEMAND_SURCHARGE = 'HIGH_DEMAND_SURCHARGE',
}

@Schema({ timestamps: true })
export class PricingRule {
  /** Team owning this rule. Null → global rule applied to everyone. */
  @Prop({ type: Types.ObjectId, ref: 'Team', default: null, index: true })
  teamId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    enum: Object.values(PricingRuleType),
    index: true,
  })
  type: PricingRuleType;

  /** Base price in EUR (canonical currency) */
  @Prop({ required: true, type: Number, min: 0 })
  basePriceEur: number;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  validFrom: Date | null;

  @Prop({ type: Date, default: null })
  validUntil: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export const PricingRuleSchema = SchemaFactory.createForClass(PricingRule);

PricingRuleSchema.index({ teamId: 1, type: 1, isActive: 1 });
PricingRuleSchema.index({ validFrom: 1, validUntil: 1 });
