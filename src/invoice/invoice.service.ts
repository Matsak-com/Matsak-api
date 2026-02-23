import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { Invoice } from './invoice.schema';
import { Types } from 'mongoose';

interface CreateInvoiceFromPaymentDto {
  paymentId: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  /**
   * Créer une facture ultra-minimaliste après paiement réussi
   */
  async createInvoiceFromPayment(
    dto: CreateInvoiceFromPaymentDto,
  ): Promise<Invoice> {
    try {
      this.logger.log(`Création facture pour payment ${dto.paymentId}`);

      // Générer le numéro de facture
      const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

      // Créer la facture (juste payment + invoiceNumber)
      const invoiceDoc: any = {
        payment: new Types.ObjectId(dto.paymentId),
        invoiceNumber,
        status: 'paid' as const,
        invoiceDate: new Date(),
      };

      const invoice = await this.invoiceRepo.create({ doc: invoiceDoc });

      this.logger.log(`✅ Facture ${invoiceNumber} créée avec succès`);

      return invoice;
    } catch (error) {
      this.logger.error(
        'Erreur lors de la création de facture',
        error.stack || error.message,
      );
      throw error;
    }
  }

  /**
   * Récupérer une facture par ID avec TOUTES les données enrichies
   */
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

    // Extraire et formater les données
    const payment = invoice.payment as any;
    const cart = payment?.cartId as any;
    const user = payment?.userId as any;

    // Trouver l'adresse par défaut
    const defaultAddress = user?.addresses?.find((addr: any) => addr.isDefault);

    // Construire la réponse enrichie
    return {
      // Données de la facture
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      status: invoice.status,
      refundedAt: invoice.refundedAt,

      // Données du paiement
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

      // Données du panier
      cart: {
        _id: cart?._id,
        items: cart?.items || [],
        // Ajoutez d'autres champs du cart si nécessaire
      },

      // Données du client
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

    // Utiliser la même logique de formatage
    return this.formatInvoiceResponse(invoice);
  }

  /**
   * Récupérer une facture par ID de paiement
   */
  async findByPaymentId(paymentId: string): Promise<Invoice | null> {
    const invoice = await this.invoiceRepo.findOne({
      filter: { payment: new Types.ObjectId(paymentId) },
    });

    return invoice;
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

    const updateData: any = {
      status,
    };

    if (status === 'refunded') {
      updateData.refundedAt = new Date();
    }

    const updated = await this.invoiceRepo.update({
      id,
      update: updateData,
    });

    this.logger.log(`Facture ${invoice.invoiceNumber} → statut: ${status}`);

    return updated;
  }

  /**
   * Trouver toutes les factures d'un client
   */
  async findByCustomer(customerId: string): Promise<any[]> {
    const invoices = await this.invoiceRepo.findAll({
      filter: {
        deleted_at: { $exists: false },
      },
      options: {
        sort: { invoiceDate: -1 },
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

    // Filtrer par customerId et formater
    return invoices
      .filter((invoice: any) => {
        const payment = invoice.payment as any;
        return payment?.userId?._id?.toString() === customerId;
      })
      .map((invoice) => this.formatInvoiceResponse(invoice));
  }

  /**
   * Soft delete
   */
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

  /**
   * Formater la réponse de la facture (méthode utilitaire)
   */
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
