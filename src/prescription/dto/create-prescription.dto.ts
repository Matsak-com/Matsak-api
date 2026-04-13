import { PrescriptionStatus } from '../prescription.schema';

export class CreatePrescriptionDto {
  fileName: string;
  storagePath: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  cartId?: string;
  status?: PrescriptionStatus;
  invoiceId?: string;
  userId?: string;
  validatedBy?: string;
  validatedAt?: Date;
  rejectionReason?: string;
}
