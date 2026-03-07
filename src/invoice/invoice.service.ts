import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { Invoice } from './invoice.schema';
import { Types } from 'mongoose';

interface CreateInvoiceFromPaymentDto {
  paymentId: string;
  userId?: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  /**
   * Créer une facture après paiement réussi.
   *
   * Idempotent : si callback et polling arrivent simultanément, la contrainte
   * unique sur `payment` (invoice.schema.ts) lève un MongoError 11000.
   * On intercepte cette erreur et on retourne la facture déjà créée plutôt
   * que de propager une exception.
   */
  async createInvoiceFromPayment(
    dto: CreateInvoiceFromPaymentDto,
  ): Promise<Invoice> {
    try {
      this.logger.log(`Création facture pour payment ${dto.paymentId}`);

      const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

      const invoiceDoc: any = {
        payment: new Types.ObjectId(dto.paymentId),
        // userId dénormalisé pour permettre findByCustomer directement en base
        // sans charger toutes les factures en mémoire
        ...(dto.userId && { userId: new Types.ObjectId(dto.userId) }),
        invoiceNumber,
        status: 'paid' as const,
        invoiceDate: new Date(),
      };

      const invoice = await this.invoiceRepo.create({ doc: invoiceDoc });

      this.logger.log(`✅ Facture ${invoiceNumber} créée`);

      return invoice;
    } catch (error) {
      // Contrainte unique sur `payment` : race condition entre handleCallback
      // et pollStatus → la facture a déjà été créée par l'autre processus
      if ((error as any)?.code === 11000) {
        this.logger.warn(
          `Race condition détectée : facture déjà existante pour payment ${dto.paymentId} — retour de la facture existante`,
        );

        const existing = await this.invoiceRepo.findOne({
          filter: { payment: new Types.ObjectId(dto.paymentId) },
        });

        if (existing) return existing;

        // Extrêmement improbable : 11000 mais document introuvable
        this.logger.error(
          `Incohérence : duplicate key mais aucune facture trouvée pour payment ${dto.paymentId}`,
        );
      }

      this.logger.error(
        'Erreur lors de la création de facture',
        error.stack || error.message,
      );
      throw error;
    }
  }

  /**
   * Récupérer une facture par ID avec toutes les données enrichies
   */
  async findOne(id: string): Promise<any> {
    const invoice = await this.invoiceRepo.findById({
      id,
      options: {
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

    if (!invoice) {
      throw new NotFoundException(`Facture ${id} introuvable`);
    }

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
      cart: { _id: cart?._id, items: cart?.items || [] },
      customer: user
        ? {
            name: user.name,
            email: user.email,
            defaultShippingAddress: defaultAddress || null,
          }
        : null,
    };
  }

  /**
   * Récupérer une facture par numéro
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<any> {
    const invoice = await this.invoiceRepo.findOne({
      filter: { invoiceNumber },
      options: {
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

    if (!invoice) {
      throw new NotFoundException(`Facture ${invoiceNumber} introuvable`);
    }

    return this.formatInvoiceResponse(invoice);
  }

  /**
   * Récupérer une facture par ID de paiement
   */
  async findByPaymentId(paymentId: string): Promise<Invoice | null> {
    return this.invoiceRepo.findOne({
      filter: { payment: new Types.ObjectId(paymentId) },
    });
  }

  /**
   * Mettre à jour le statut
   */
  async updateStatus(
    id: string,
    status: 'paid' | 'refunded' | 'cancelled',
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById({ id });

    if (!invoice) {
      throw new NotFoundException(`Facture ${id} introuvable`);
    }

    const updateData: any = { status };
    if (status === 'refunded') updateData.refundedAt = new Date();

    const updated = await this.invoiceRepo.update({ id, update: updateData });

    this.logger.log(`Facture ${invoice.invoiceNumber} → statut: ${status}`);

    return updated;
  }

  /**
   * Trouver toutes les factures d'un client.
   * Filtre directement en base sur le champ userId dénormalisé —
   * évite le chargement en mémoire de toutes les factures.
   */
  async findByCustomer(customerId: string): Promise<any[]> {
    const invoices = await this.invoiceRepo.findAll({
      filter: {
        userId: new Types.ObjectId(customerId),
        deleted_at: { $exists: false },
      },
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

    return invoices.map((invoice) => this.formatInvoiceResponse(invoice));
  }

  /**
   * Soft delete
   */
  async remove(id: string): Promise<void> {
    const invoice = await this.invoiceRepo.findById({ id });

    if (!invoice) {
      throw new NotFoundException(`Facture ${id} introuvable`);
    }

    await this.invoiceRepo.update({ id, update: { deleted_at: new Date() } });

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
      cart: { _id: cart?._id, items: cart?.items || [] },
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
