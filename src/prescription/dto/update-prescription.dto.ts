import { PrescriptionStatus } from '../prescription.schema';
import { Types } from 'mongoose';

export class UpdatePrescriptionDto {
  status?: PrescriptionStatus;
  cartId?: Types.ObjectId | null;
  invoiceId?: Types.ObjectId | null;
  validatedBy?: string;
  validatedAt?: Date;
  rejectionReason?: string;
}
