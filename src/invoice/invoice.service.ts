import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InvoiceRepository } from './invoice.repository';
import { Invoice, InvoiceStatus } from './invoice.schema';
import { NotificationService } from '../notifications/notification.service';
import { Payment } from '../payment/payment.schema';
import { Cart } from '../cart-item/cart-item.schema';
import * as QRCode from 'qrcode';
import { DeliveryMethod } from '../payment/payment.schema';

interface CreateInvoiceFromPaymentDto {
  paymentId: string;
}

interface CidAttachment {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly MAX_INVOICE_RETRIES = 3;

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly notificationService: NotificationService,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
  ) {}

  async createInvoiceFromPayment(
    dto: CreateInvoiceFromPaymentDto,
  ): Promise<Invoice> {
    for (let attempt = 1; attempt <= this.MAX_INVOICE_RETRIES; attempt++) {
      try {
        const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

        const payment = await this.paymentModel
          .findById(dto.paymentId)
          .populate('cartId')
          .lean();

        if (!payment) throw new NotFoundException('Payment introuvable');

        const cart = payment.cartId as any;

        const invoiceDoc = {
          payment: new Types.ObjectId(dto.paymentId),
          userId: payment.userId ?? undefined,
          cartSnapshot: {
            cartId: cart._id,
            sessionId: cart.sessionId,
            items: cart.items.map((item: any) => ({
              product: item.product,
              quantity: item.quantity,
            })),
            snapshotAt: new Date(),
          },
          invoiceNumber,
          status: InvoiceStatus.PAID,
          invoiceDate: new Date(),
        };

        const invoice = await this.invoiceRepo.create({ doc: invoiceDoc });
        this.logger.log(`✅ Facture ${invoiceNumber} créée avec succès`);

        // ── Email envoyé en fire-and-forget — ne bloque pas le post-traitement
        const fullInvoice = await this.findOne(invoice._id.toString());
        this.sendInvoiceEmail(fullInvoice).catch((err) =>
          this.logger.error(
            `Échec envoi email facture ${invoiceNumber}`,
            err.stack,
          ),
        );

        return invoice;
      } catch (error) {
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

  // ─── Génération QR code ───────────────────────────────────────────────────

  private async generateQRCodeBuffer(data: object): Promise<Buffer> {
    return QRCode.toBuffer(JSON.stringify(data), {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
      type: 'png',
    });
  }

  // ─── Email principal ──────────────────────────────────────────────────────

  private async sendInvoiceEmail(invoice: any): Promise<void> {
    const { customer, payment, cart } = invoice;

    if (!customer?.email) {
      this.logger.warn(
        `Pas d'email client pour la facture ${invoice.invoiceNumber}`,
      );
      return;
    }

    const isPickup = payment.deliveryMethod === DeliveryMethod.PICKUP;
    const attachments: CidAttachment[] = [];

    const teamMap = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        items: any[];
        subtotalRaw: number;
        qrCid?: string;
      }
    >();

    for (const item of cart?.items ?? []) {
      const product = item.product;
      const detail = product?.detail;
      const team = product?.team;

      const teamId = team?._id?.toString() ?? 'sans-team';
      const teamName = team?.name ?? 'Autres produits';

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, { teamId, teamName, items: [], subtotalRaw: 0 });
      }

      const unitPrice = item.price ?? product?.basePrice ?? 0;
      const quantity = item.quantity ?? 1;
      const lineTotal = unitPrice * quantity;

      teamMap.get(teamId).subtotalRaw += lineTotal;
      teamMap.get(teamId).items.push({
        name: detail?.name ?? product?.name ?? 'Produit',
        quantity,
        unitPrice: this.formatAmount(unitPrice),
        totalPrice: this.formatAmount(lineTotal),
        unitPriceRaw: unitPrice,
        totalPriceRaw: lineTotal,
      });
    }

    let deliveryCid: string | null = null;
    let deliveryAddress: any = null;

    if (!isPickup) {
      const addr = customer?.defaultShippingAddress;
      if (addr) {
        deliveryAddress = {
          name: `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim(),
          addressLine: addr.addressLine ?? '',
          city: addr.city ?? '',
          state: addr.state ?? '',
          phone: addr.phone ?? '',
        };
      }

      const qrPayload = {
        type: 'DELIVERY',
        invoiceNumber: invoice.invoiceNumber,
        paymentId: payment._id?.toString() ?? '',
        customerName: customer.name ?? 'Client',
        deliveryAddress: deliveryAddress
          ? [
              deliveryAddress.addressLine,
              deliveryAddress.city,
              deliveryAddress.state,
            ]
              .filter(Boolean)
              .join(', ')
          : '',
        amount: payment.amount,
        currency: payment.currency?.toUpperCase() ?? 'Ar',
      };

      try {
        const buffer = await this.generateQRCodeBuffer(qrPayload);
        deliveryCid = `qr-delivery-${invoice.invoiceNumber}`;
        attachments.push({
          filename: `qr-livraison-${invoice.invoiceNumber}.png`,
          content: buffer,
          cid: deliveryCid,
          contentType: 'image/png',
        });
        this.logger.log(`✅ QR livraison généré pour ${invoice.invoiceNumber}`);
      } catch (err) {
        this.logger.error(`Erreur génération QR livraison`, err);
      }
    }

    if (isPickup) {
      for (const [teamId, teamData] of teamMap.entries()) {
        const qrPayload = {
          type: 'PICKUP',
          invoiceNumber: invoice.invoiceNumber,
          paymentId: payment._id?.toString() ?? '',
          teamId,
          teamName: teamData.teamName,
          customerName: customer.name ?? 'Client',
          items: teamData.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
          })),
          subtotal: teamData.subtotalRaw,
          currency: payment.currency?.toUpperCase() ?? 'Ar',
        };

        try {
          const buffer = await this.generateQRCodeBuffer(qrPayload);
          const cid = `qr-pickup-${teamId}`;
          teamData.qrCid = cid;
          attachments.push({
            filename: `qr-retrait-${teamData.teamName.replace(/\s+/g, '-')}.png`,
            content: buffer,
            cid,
            contentType: 'image/png',
          });
          this.logger.log(`✅ QR retrait généré pour team ${teamId}`);
        } catch (err) {
          this.logger.error(`Erreur génération QR retrait team ${teamId}`, err);
        }
      }
    }

    const teams = Array.from(teamMap.values()).map(
      ({ subtotalRaw, items, ...rest }) => ({
        ...rest,
        subtotal: this.formatAmount(subtotalRaw),
        items: items.map(({ ...item }) => item),
      }),
    );

    const context = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      payment: {
        method: this.formatPaymentMethod(payment.method),
        amount: this.formatAmount(payment.amount),
        currency: payment.currency?.toUpperCase() ?? 'Ar',
        transactionReference: payment.transactionReference ?? '-',
        customerPhone: payment.customerPhone ?? null,
      },
      customer: {
        name: customer.name ?? 'Client',
        email: customer.email,
      },
      isPickup,
      deliveryAddress,
      deliveryCid,
      teams,
    };

    await this.notificationService.sendEmail({
      to: customer.email,
      subject: `Votre facture ${invoice.invoiceNumber}`,
      template: 'invoice',
      context: JSON.parse(JSON.stringify(context)),
      locale: 'fr',
      attachments,
    });

    this.logger.log(
      `📧 Email facture ${invoice.invoiceNumber} envoyé à ${customer.email}`,
    );
  }

  // ─── Formatters ───────────────────────────────────────────────────────────

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private formatPaymentMethod(method: string): string {
    const map: Record<string, string> = {
      MVOLA: 'MVola',
      mvola: 'MVola',
      orange_money: 'Orange Money',
      airtel_money: 'Airtel Money',
      card: 'Carte bancaire',
      cash: 'Espèces',
    };
    return map[method] ?? method ?? '-';
  }

  // ─── Populate commun ──────────────────────────────────────────────────────

  private get populateOptions() {
    return [
      {
        path: 'payment',
        populate: [
          { path: 'userId', select: 'name email addresses' },
          {
            path: 'cartId',
            populate: {
              path: 'items.product',
              populate: [
                { path: 'detail' },
                { path: 'team', select: 'name _id' },
              ],
            },
          },
        ],
      },
    ];
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<any> {
    const invoice = await this.invoiceRepo.findById({
      id,
      options: { populate: this.populateOptions },
    });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    return this.formatInvoiceResponse(invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<any> {
    const invoice = await this.invoiceRepo.findOne({
      filter: { invoiceNumber },
      options: { populate: this.populateOptions },
    });
    if (!invoice)
      throw new NotFoundException(`Facture ${invoiceNumber} introuvable`);
    return this.formatInvoiceResponse(invoice);
  }

  async findByPaymentId(paymentId: string): Promise<Invoice | null> {
    return this.invoiceRepo.findOne({
      filter: { payment: new Types.ObjectId(paymentId) },
    });
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById({ id });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);

    const updateData: any = { status };
    if (status === InvoiceStatus.REFUNDED) updateData.refundedAt = new Date();

    const updated = await this.invoiceRepo.update({ id, update: updateData });
    this.logger.log(`Facture ${invoice.invoiceNumber} → statut: ${status}`);
    return updated;
  }

  async findByCustomer(customerId: string): Promise<any[]> {
    const invoices = await this.invoiceRepo.findAll({
      filter: {
        userId: new Types.ObjectId(customerId),
        deleted_at: { $exists: false },
      },
      options: { sort: { invoiceDate: -1 }, populate: this.populateOptions },
    });

    return invoices.map((invoice) => this.formatInvoiceResponse(invoice));
  }

  private formatInvoiceResponse(invoice: any): any {
    const payment = invoice.payment as any;
    const user = payment?.userId as any;
    const defaultAddress = user?.addresses?.find((addr: any) => addr.isDefault);

    const cartItems = invoice.cartSnapshot?.items?.length
      ? invoice.cartSnapshot.items
      : ((payment?.cartId as any)?.items ?? []);

    return {
      _id: invoice._id,
      userId: invoice.userId?.toString() ?? payment?.userId?._id?.toString(),
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      status: invoice.status,
      refundedAt: invoice.refundedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      payment: {
        _id: payment._id,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        deliveryMethod: payment.deliveryMethod,
        deliveryAddressId: payment.deliveryAddressId,
        correlationId: payment.correlationId,
        customerPhone: payment.customerPhone,
        transactionReference: payment.transactionReference,
        serverCorrelationId: payment.serverCorrelationId,
        mvolaResponse: payment.mvolaResponse,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      cart: {
        _id: invoice.cartSnapshot?.cartId ?? (payment?.cartId as any)?._id,
        items: cartItems,
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

  async remove(id: string): Promise<void> {
    const invoice = await this.invoiceRepo.findById({ id });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    await this.invoiceRepo.update({ id, update: { deleted_at: new Date() } });
    this.logger.log(`Facture ${invoice.invoiceNumber} supprimée (soft delete)`);
  }
}
