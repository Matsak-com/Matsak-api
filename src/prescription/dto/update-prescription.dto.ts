import { PrescriptionStatus } from '../prescription.schema';

export class UpdatePrescriptionDto {
  status?: PrescriptionStatus;
  invoiceId?: string;
  cartId?: string | null;
}
