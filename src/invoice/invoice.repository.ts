import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Invoice, InvoiceDocument } from './invoice.schema';
import { Counter, CounterDocument } from './counter.schema';

@Injectable()
export class InvoiceRepository extends BaseRepository<InvoiceDocument> {
  constructor(
    @InjectModel(Invoice.name)
    invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {
    super(invoiceModel);
  }

  /**
   * Generate next invoice number
   */
  async generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}`;

  // ✅ Atomique : incrémente un compteur en une seule opération
  const counter = await this.counterModel.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );

  const nextNumber = String(counter.seq).padStart(4, '0');
  return `${prefix}-${nextNumber}`;
}

}
