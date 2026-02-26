import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { Invoice, InvoiceStatus } from './invoice.schema';
import { Types } from 'mongoose';

interface CreateInvoiceFromPaymentDto {
  paymentId: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly MAX_INVOICE_RETRIES = 3;

  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  async createInvoiceFromPayment(
    dto: CreateInvoiceFromPaymentDto,
  ): Promise<Invoice> {
    this.logger.log(`Création facture pour payment ${dto.paymentId}`);

    for (let attempt = 1; attempt <= this.MAX_INVOICE_RETRIES; attempt++) {
      try {
        const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

        const invoiceDoc: any = {
          payment: new Types.ObjectId(dto.paymentId),
          invoiceNumber,
          status: InvoiceStatus.PAID,
          invoiceDate: new Date(),
        };

        const invoice = await this.invoiceRepo.create({ doc: invoiceDoc });

        this.logger.log(`✅ Facture ${invoiceNumber} créée avec succès`);

        return invoice;
      } catch (error) {
        // Retry sur collision de numéro de facture
        if (error.code === 11000 && attempt < this.MAX_INVOICE_RETRIES) {
          this.logger.warn(
            `Collision invoiceNumber — retry ${attempt}/${this.MAX_INVOICE_RETRIES}`,
          );
          continue;
        }

        this.logger.error(
          'Erreur lors de la création de facture',
          error.stack || error.message,
        );
        throw error;
      }
    }
  }

  async findOne(id: string): Promise<any> {
    const invoice = await this.invoiceRepo.findById({
      id,
      options: {
        populate: [
          {
            path: 'payment',
            populate: [
              {
                path: 'userId',
                select: 'name email addresses',
              },
              {
                path: 'cartId',
                populate: {
                  path: 'items.product',
                  populate: { path: 'detail' },
                },
              },
            ],
          },
        ],
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Facture ${id} introuvable`);
    }

    return this.formatInvoiceResponse(invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<any> {
    const invoice = await this.invoiceRepo.findOne({
      filter: { invoiceNumber },
      options: {
        populate: [
          {
            path: 'payment',
            populate: [
              {
                path: 'userId',
                select: 'name email addresses',
              },
              {
                path: 'cartId',
                populate: {
                  path: 'items.product',
                  populate: { path: 'detail' },
                },
              },
            ],
          },
        ],
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Facture ${invoiceNumber} introuvable`);
    }

    return this.formatInvoiceResponse(invoice);
  }

  async findByPaymentId(paymentId: string): Promise<Invoice | null> {
    return this.invoiceRepo.findOne({
      filter: { payment: new Types.ObjectId(paymentId) },
    });
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById({ id });

    if (!invoice) {
      throw new NotFoundException(`Facture ${id} introuvable`);
    }

    const updateData: any = { status };

    if (status === InvoiceStatus.REFUNDED) {
      updateData.refundedAt = new Date();
    }

    const updated = await this.invoiceRepo.update({ id, update: updateData });

    this.logger.log(`Facture ${invoice.invoiceNumber} → statut: ${status}`);

    return updated;
  }

  async findByCustomer(customerId: string): Promise<any[]> {
    const invoices = await this.invoiceRepo.findAll({
      filter: { deleted_at: { $exists: false } },
      options: {
        sort: { invoiceDate: -1 },
        populate: [
          {
            path: 'payment',
            populate: [
              { path: 'userId', select: 'name email addresses' },
              {
                path: 'cartId',
                populate: {
                  path: 'items.product',
                  populate: { path: 'detail' },
                },
              },
            ],
          },
        ],
      },
    });

    return invoices
      .filter((invoice: any) => {
        const payment = invoice.payment as any;
        return payment?.userId?._id?.toString() === customerId;
      })
      .map((invoice) => this.formatInvoiceResponse(invoice));
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.invoiceRepo.findById({ id });

    if (!invoice) {
      throw new NotFoundException(`Facture ${id} introuvable`);
    }

    await this.invoiceRepo.update({
      id,
      update: { deleted_at: new Date() },
    });

    this.logger.log(`Facture ${invoice.invoiceNumber} supprimée (soft delete)`);
  }

  private formatInvoiceResponse(invoice: any): any {
    const payment = invoice.payment as any;
    const cart = payment?.cartId as any;
    const user = payment?.userId as any;
    const defaultAddress = user?.addresses?.find((addr: any) => addr.isDefault);

    return {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      status: invoice.status,
      refundedAt: invoice.refundedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,

      payment: {
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        correlationId: payment.correlationId,
        customerPhone: payment.customerPhone,
        transactionReference: payment.transactionReference,
        serverCorrelationId: payment.serverCorrelationId,
        mvolaResponse: payment.mvolaResponse,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },

      cart: {
        _id: cart?._id,
        items: cart?.items || [],
      },

      customer: user
        ? {
            name: user.name,
            email: user.email,
            defaultShippingAddress: defaultAddress || null,
          }
        : null,
    };
  }
}
