import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Invoice, InvoiceDocument } from './invoice.schema';

@Injectable()
export class InvoiceRepository extends BaseRepository<InvoiceDocument> {
  constructor(
    @InjectModel(Invoice.name)
    invoiceModel: Model<InvoiceDocument>,
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

    // Find last invoice with this prefix
    const lastInvoice = await this.model
      .findOne({ invoiceNumber: new RegExp(`^${prefix}`) })
      .sort({ invoiceNumber: -1 })
      .exec();

    if (!lastInvoice) {
      return `${prefix}-0001`;
    }

    // Extract number and increment
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
    const nextNumber = String(lastNumber + 1).padStart(4, '0');

    return `${prefix}-${nextNumber}`;
  }

  /**
   * Find invoices by customer
   */
  async findByCustomer(customerId: string) {
    return this.findAll({
      filter: {
        customer: customerId,
        deleted_at: { $exists: false },
      },
      options: {
        sort: { invoiceDate: -1 },
        populate: [
          { path: 'customer', select: 'name email' },
          { path: 'team', select: 'name' },
          { path: 'payment' },
        ],
      },
    });
  }

  /**
   * Find invoices by team
   */
  async findByTeam(teamId: string) {
    return this.findAll({
      filter: {
        team: teamId,
        deleted_at: { $exists: false },
      },
      options: {
        sort: { invoiceDate: -1 },
        populate: [
          { path: 'customer', select: 'name email' },
          { path: 'payment' },
        ],
      },
    });
  }
}
