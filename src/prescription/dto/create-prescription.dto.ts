// dto/create-prescription.dto.ts
import { PrescriptionStatus } from '../prescription.schema';
import { Types } from 'mongoose';

export class CreatePrescriptionDto {
  fileName: string;
  storagePath: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  status?: PrescriptionStatus;

  cartId?: Types.ObjectId | null;
  invoiceId?: Types.ObjectId | null;

  userId?: string;
  validatedBy?: string;
  validatedAt?: Date;
  rejectionReason?: string;
}
