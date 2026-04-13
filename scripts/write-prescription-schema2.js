const fs = require('fs');
const path = require('path');
const target = path.resolve(__dirname, '../src/prescription/prescription.schema.ts');
console.log('target', target);
console.log('exists', fs.existsSync(target));
if (fs.existsSync(target)) {
  const stats = fs.statSync(target);
  console.log('size', stats.size);
}
try {
  fs.unlinkSync(target);
  console.log('removed');
} catch (error) {
  console.log('remove-error', error.message);
}
const content = `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrescriptionDocument = Prescription & Document;

export enum PrescriptionStatus {
  AWAIT = 'await',
  VALIDATED = 'validated',
  REFUSED = 'refused',
}

@Schema({ timestamps: true })
export class Prescription {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Cart',
    required: true,
    index: true,
  })
  cartId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Invoice',
    required: false,
    sparse: true,
    index: true,
    default: null,
  })
  invoiceId?: Types.ObjectId | null;

  @Prop({
    required: true,
    enum: Object.values(PrescriptionStatus),
    default: PrescriptionStatus.AWAIT,
    index: true,
  })
  status: PrescriptionStatus;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
`;
fs.writeFileSync(target, content, 'utf8');
console.log('written');
console.log('size', fs.statSync(target).size);
