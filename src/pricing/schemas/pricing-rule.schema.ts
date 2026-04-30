import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PricingRuleDocument = PricingRule & Document;

export enum PricingRuleType {
  DELIVERY = 'DELIVERY',
  SERVICE = 'SERVICE',
  HIGH_DEMAND_SURCHARGE = 'HIGH_DEMAND_SURCHARGE',
}

/**
 * Determines how the surcharge amount is computed:
 *  - FIXED      → `basePriceEur` is used as a fixed EUR amount.
 *  - PERCENTAGE → `basePercentage` is applied against the invoice subtotal
 *                 (e.g. 5 means 5% of the cart subtotal in EUR).
 */
export enum PricingRuleBaseType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
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

  /**
   * How the surcharge amount is computed.
   * Defaults to FIXED for backward compatibility.
   */
  @Prop({
    required: true,
    enum: Object.values(PricingRuleBaseType),
    default: PricingRuleBaseType.FIXED,
  })
  baseType: PricingRuleBaseType;

  /**
   * Fixed surcharge amount in EUR (canonical currency).
   * Required when baseType = FIXED. Null when baseType = PERCENTAGE.
   */
  @Prop({ type: Number, min: 0, default: null })
  basePriceEur: number | null;

  /**
   * Percentage of the invoice subtotal to charge as surcharge (0–100).
   * Required when baseType = PERCENTAGE. Null when baseType = FIXED.
   */
  @Prop({ type: Number, min: 0, max: 100, default: null })
  basePercentage: number | null;

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
