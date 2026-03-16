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

    // Trouver le max réel en base
    const lastInvoice = await this.model
      .findOne({ invoiceNumber: { $regex: `^${prefix}-` } })
      .sort({ invoiceNumber: -1 })
      .select('invoiceNumber')
      .lean();

    const lastSeqInDb = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.split('-')[2], 10)
      : 0;

    // Incrémenter le compteur, mais jamais en dessous du max en base
    const updated = await this.counterModel.findOneAndUpdate(
      { _id: prefix },
      [
        {
          $set: {
            seq: {
              $add: [{ $max: ['$seq', lastSeqInDb] }, 1],
            },
          },
        },
      ],
      { upsert: true, new: true },
    );

    return `${prefix}-${String(updated.seq).padStart(4, '0')}`;
  }
}
