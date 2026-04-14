import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InvoiceRepository } from './invoice.repository';
import { Invoice, InvoiceStatus } from './invoice.schema';
import { NotificationService } from '../notifications/notification.service';
import { Payment } from '../payment/payment.schema';
import * as QRCode from 'qrcode';
import { DeliveryMethod } from '../payment/payment.schema';
import { PricingService, DEFAULT_CURRENCY } from '../pricing/pricing.service';
import { User, UserRole } from '../users/user.schema';
import { Member, MemberStatus } from '../members/member.schema';
import { Role } from '../roles/role.schema';

interface CreateInvoiceFromPaymentDto {
  paymentId: string;
  /** Optional promo code to apply */
  promoCode?: string;
  /** Target display currency — defaults to MGA */
  currency?: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly MAX_INVOICE_RETRIES = 3;

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly notificationService: NotificationService,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    private readonly pricingService: PricingService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Member.name) private readonly memberModel: Model<Member>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async createInvoiceFromPayment(
    dto: CreateInvoiceFromPaymentDto,
  ): Promise<Invoice> {
    for (let attempt = 1; attempt <= this.MAX_INVOICE_RETRIES; attempt++) {
      try {
        const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

        const payment = await this.paymentModel
          .findById(dto.paymentId)
          .populate({
            path: 'cartId',
            populate: {
              path: 'items.product',
              populate: [
                { path: 'detail', select: 'name description' },
                { path: 'team', select: '_id name' },
              ],
            },
          })
          .lean();

        if (!payment) throw new NotFoundException('Payment introuvable');

        const cart = payment.cartId as any;

        // Compute cart subtotal in the products' own currency (basePrice is
        // stored in the product's `currency` field, which defaults to 'MGA').
        const cartItems = cart.items as any[];
        const currencies = [
          ...new Set(
            cartItems
              .map((item: any) => item.product?.currency)
              .filter(Boolean),
          ),
        ] as string[];

        if (currencies.length > 1) {
          this.logger.warn(
            `Cart contains items in mixed currencies (${currencies.join(', ')}); ` +
              `defaulting to MGA for subtotal calculation`,
          );
        }

        const productCurrency: string = currencies[0] ?? 'MGA';
        const cartSubtotal = cartItems.reduce(
          (sum: number, item: any) =>
            sum + (item.product?.basePrice ?? 0) * (item.quantity ?? 1),
          0,
        );

        // Determine team from first item (all items belong to same team typically)
        const teamId: string | null =
          cart.items?.[0]?.product?.team?._id?.toString() ?? null;

        const currency = dto.currency ?? DEFAULT_CURRENCY;

        // Calculate full pricing summary (rates, surcharges, promo)
        const pricing = await this.pricingService.calculateTotal({
          cartSubtotalEur: cartSubtotal,
          currentCurrency: productCurrency,
          teamId,
          promoCode: dto.promoCode ?? null,
          currency,
          deliveryMethod: payment.deliveryMethod ?? 'delivery',
        });

        // Redeem promo code atomically (fire only if provided and valid)
        if (dto.promoCode && pricing.promoCodeSnapshot) {
          await this.pricingService
            .redeemPromoCode(
              dto.promoCode,
              pricing.subtotalEur,
              teamId ?? undefined,
            )
            .catch((err) =>
              this.logger.error(
                `Promo redemption failed for ${dto.promoCode}`,
                err.message,
              ),
            );
        }

        const invoiceDoc = {
          payment: new Types.ObjectId(dto.paymentId),
          userId: payment.userId ?? undefined,
          deliveryMethod: payment.deliveryMethod ?? DeliveryMethod.DELIVERY,
          deliveryAddressId: payment.deliveryAddressId
            ? new Types.ObjectId(payment.deliveryAddressId.toString())
            : undefined,
          cartSnapshot: {
            cartId: cart._id,
            sessionId: cart.sessionId,
            items: cart.items.map((item: any) => ({
              product: {
                _id: item.product._id,
                name:
                  item.product.detail?.name ?? item.product.name ?? 'Produit',
                description: item.product.detail?.description ?? null,
                team: item.product.team
                  ? { _id: item.product.team._id, name: item.product.team.name }
                  : null,
              },
              quantity: item.quantity,
              price: item.product?.basePrice ?? 0,
            })),
            snapshotAt: new Date(),
          },
          invoiceNumber,
          status: InvoiceStatus.PAID,
          invoiceDate: new Date(),
          // ── Pricing snapshot ───────────────────────────────────
          currency: pricing.currency,
          exchangeRate: pricing.exchangeRate,
          exchangeRateSnapshotAt: pricing.exchangeRateSnapshotAt,
          subtotalEur: pricing.subtotalEur,
          subtotalLocal: pricing.subtotalLocal,
          pricingLines: pricing.pricingLines,
          surchargesTotalEur: pricing.surchargesTotalEur,
          surchargesTotalLocal: pricing.surchargesTotalLocal,
          discountEur: pricing.discountEur,
          discountLocal: pricing.discountLocal,
          promoCodeSnapshot: pricing.promoCodeSnapshot,
          totalEur: pricing.totalEur,
          totalLocal: pricing.totalLocal,
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

    const teamMap = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        items: any[];
        subtotalRaw: number;
        // QR code embedded as data URI — avoids CID attachments which force
        // a multipart/related MIME envelope that breaks HTML rendering.
        qrDataUri?: string;
      }
    >();

    for (const item of cart?.items ?? []) {
      const product = item.product;
      const team = product?.team; // déjà { _id, name } dans le snapshot

      const teamId = team?._id?.toString() ?? 'sans-team';
      const teamName = team?.name ?? 'Autres produits';

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, { teamId, teamName, items: [], subtotalRaw: 0 });
      }

      const unitPrice = item.price ?? 0; // ← prix figé dans le snapshot
      const quantity = item.quantity ?? 1;
      const lineTotal = unitPrice * quantity;

      teamMap.get(teamId).subtotalRaw += lineTotal;
      teamMap.get(teamId).items.push({
        name: product?.name ?? 'Produit', // ← name déjà dans le snapshot
        quantity,
        unitPrice: this.formatAmount(unitPrice),
        totalPrice: this.formatAmount(lineTotal),
        unitPriceRaw: unitPrice,
        totalPriceRaw: lineTotal,
      });
    }

    let deliveryQrDataUri: string | null = null;
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
        deliveryQrDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
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
          teamData.qrDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
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
      deliveryQrDataUri,
      teams,
    };

    await this.notificationService.sendEmail({
      to: customer.email,
      subject: `Votre facture ${invoice.invoiceNumber}`,
      template: 'invoice',
      context: JSON.parse(JSON.stringify(context)),
      locale: 'fr',
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
          // cartId gardé comme fallback uniquement
          { path: 'cartId', select: '_id' },
        ],
      },
    ];
  }
  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(): Promise<any[]> {
    const invoices = await this.invoiceRepo.findAll({
      options: { sort: { invoiceDate: -1 }, populate: this.populateOptions },
    });
    return invoices.map((invoice) => this.formatInvoiceResponse(invoice));
  }

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

    // Fire-and-forget — does not block the response
    this.findOne(id)
      .then((fullInvoice) => this.sendStatusUpdateEmails(fullInvoice, status))
      .catch((err) =>
        this.logger.error(
          `Erreur envoi emails statut ${invoice.invoiceNumber}`,
          err.stack,
        ),
      );

    return updated;
  }

  // ─── Status email helpers ─────────────────────────────────────────────────

  /**
   * Returns status-specific display data for both locales.
   * All values are pre-computed so templates stay logic-free.
   */
  private getStatusConfig(status: InvoiceStatus): {
    color: string;
    shadow: string;
    bg: string;
    label: Record<string, string>;
    message: Record<string, string>;
  } {
    const configs: Record<
      InvoiceStatus,
      ReturnType<InvoiceService['getStatusConfig']>
    > = {
      [InvoiceStatus.PAID]: {
        color: '#27ae60',
        shadow: 'rgba(39, 174, 96, 0.30)',
        bg: 'rgba(39, 174, 96, 0.07)',
        label: { fr: 'Payé', en: 'Paid' },
        message: {
          fr: 'Votre paiement a bien été confirmé et votre facture est désormais clôturée. Merci pour votre confiance.',
          en: 'Your payment has been confirmed and your invoice is now closed. Thank you for your trust.',
        },
      },
      [InvoiceStatus.REFUNDED]: {
        color: '#e67e22',
        shadow: 'rgba(230, 126, 34, 0.30)',
        bg: 'rgba(230, 126, 34, 0.07)',
        label: { fr: 'Remboursé', en: 'Refunded' },
        message: {
          fr: 'Un remboursement a été initié pour cette facture. Le montant sera restitué selon les délais habituels de votre moyen de paiement. Si vous avez des questions, contactez notre équipe.',
          en: "A refund has been initiated for this invoice. The amount will be returned according to your payment method's usual processing time. If you have any questions, please contact our team.",
        },
      },
      [InvoiceStatus.CANCELLED]: {
        color: '#e74c3c',
        shadow: 'rgba(231, 76, 60, 0.30)',
        bg: 'rgba(231, 76, 60, 0.07)',
        label: { fr: 'Annulé', en: 'Cancelled' },
        message: {
          fr: "Cette facture a été annulée. Si vous pensez qu'il s'agit d'une erreur ou si vous avez des questions, n'hésitez pas à contacter notre équipe de support.",
          en: 'This invoice has been cancelled. If you believe this is an error or have any questions, please do not hesitate to contact our support team.',
        },
      },
    };
    return configs[status];
  }

  /**
   * Builds formatted invoice context shared between customer and admin emails.
   */
  private buildInvoiceEmailContext(fullInvoice: any) {
    return {
      number: fullInvoice.invoiceNumber,
      date: new Date(fullInvoice.invoiceDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      paymentMethod: this.formatPaymentMethod(fullInvoice.payment?.method),
      amount: this.formatAmount(
        fullInvoice.totalLocal ?? fullInvoice.payment?.amount ?? 0,
      ),
      currency: (
        fullInvoice.currency ??
        fullInvoice.payment?.currency ??
        'MGA'
      ).toUpperCase(),
    };
  }

  /**
   * Collects distinct team names referenced in the invoice cart snapshot.
   */
  private extractTeamNames(fullInvoice: any): string[] {
    const teams = new Map<string, string>();
    for (const item of fullInvoice.cart?.items ?? []) {
      const team = item.product?.team;
      if (team?._id) {
        teams.set(team._id.toString(), team.name ?? 'Pharmacie');
      }
    }
    return Array.from(teams.values());
  }

  /**
   * Resolves the MongoDB ObjectId of the role named "admin" (case-insensitive).
   * Returns null if the role does not exist.
   */
  private async resolveAdminRoleId(): Promise<Types.ObjectId | null> {
    const adminRole = await this.roleModel
      .findOne({ name: /^admin$/i, deleted_at: { $exists: false } })
      .select('_id')
      .lean();
    return adminRole ? (adminRole._id as Types.ObjectId) : null;
  }

  /**
   * Returns distinct email addresses of active team admins for a set of team IDs.
   */
  private async getTeamAdminEmails(
    teamIds: Types.ObjectId[],
    adminRoleId: Types.ObjectId,
  ): Promise<Array<{ name: string; email: string }>> {
    if (!teamIds.length) return [];

    const members = await this.memberModel
      .find({
        team: { $in: teamIds },
        role: adminRoleId,
        status: MemberStatus.ACTIVE,
        deleted_at: { $exists: false },
      })
      .populate<{ user: User }>({ path: 'user', select: 'name email role' })
      .lean();

    const seen = new Set<string>();
    const result: Array<{ name: string; email: string }> = [];

    for (const m of members) {
      const user = m.user as any;
      if (user?.email && !seen.has(user.email)) {
        seen.add(user.email);
        result.push({ name: user.name ?? 'Admin', email: user.email });
      }
    }
    return result;
  }

  /**
   * Returns the email addresses of all active superadmins.
   */
  private async getSuperadminEmails(): Promise<
    Array<{ name: string; email: string }>
  > {
    const superadmins = await this.userModel
      .find({ role: UserRole.SUPERADMIN, deleted_at: { $exists: false } })
      .select('name email')
      .lean();

    return superadmins.map((u) => ({
      name: (u as any).name ?? 'Superadmin',
      email: (u as any).email,
    }));
  }

  /**
   * Sends status-change notification emails to:
   *  1. The customer (if they have an email on file)
   *  2. Active team admins for every team on the invoice
   *  3. All superadmins
   */
  private async sendStatusUpdateEmails(
    fullInvoice: any,
    newStatus: InvoiceStatus,
  ): Promise<void> {
    const cfg = this.getStatusConfig(newStatus);
    const invoiceCtx = this.buildInvoiceEmailContext(fullInvoice);
    const teamNames = this.extractTeamNames(fullInvoice);

    // ── 1. Customer email ────────────────────────────────────────
    const customerEmail = fullInvoice.customer?.email;
    if (customerEmail) {
      const locale: 'fr' | 'en' = 'fr';
      await this.notificationService
        .sendEmail({
          to: customerEmail,
          subject: `Mise à jour de votre facture ${fullInvoice.invoiceNumber}`,
          template: 'invoice-status-update',
          locale,
          context: {
            customer: {
              name: fullInvoice.customer?.name ?? 'Client',
              email: customerEmail,
            },
            invoice: invoiceCtx,
            statusLabel: cfg.label[locale],
            statusMessage: cfg.message[locale],
            statusColor: cfg.color,
            statusShadow: cfg.shadow,
            statusBg: cfg.bg,
          },
        })
        .catch((err) =>
          this.logger.warn(
            `Email statut client non envoyé ${fullInvoice.invoiceNumber}: ${err.message}`,
          ),
        );

      this.logger.log(
        `📧 Email statut (${newStatus}) envoyé au client ${customerEmail}`,
      );
    }

    // ── 2 & 3. Admin / Superadmin emails ─────────────────────────
    const teamIds = (fullInvoice.cart?.items ?? [])
      .map((item: any) => item.product?.team?._id)
      .filter(Boolean)
      .map((id: any) => new Types.ObjectId(id.toString()));

    const adminRoleId = await this.resolveAdminRoleId();

    const [teamAdmins, superadmins] = await Promise.all([
      adminRoleId ? this.getTeamAdminEmails(teamIds, adminRoleId) : [],
      this.getSuperadminEmails(),
    ]);

    // Merge and deduplicate by email
    const seen = new Set<string>();
    const adminRecipients: Array<{ name: string; email: string }> = [];
    for (const r of [...teamAdmins, ...superadmins]) {
      if (r.email && !seen.has(r.email)) {
        seen.add(r.email);
        adminRecipients.push(r);
      }
    }

    for (const recipient of adminRecipients) {
      const locale: 'fr' | 'en' = 'fr';
      await this.notificationService
        .sendEmail({
          to: recipient.email,
          subject: `[Admin] Changement de statut — Facture ${fullInvoice.invoiceNumber}`,
          template: 'invoice-status-update-admin',
          locale,
          context: {
            recipient: { name: recipient.name },
            customer: {
              name: fullInvoice.customer?.name ?? 'Client',
              email: fullInvoice.customer?.email ?? '-',
            },
            invoice: invoiceCtx,
            teams: teamNames,
            statusLabel: cfg.label[locale],
            statusColor: cfg.color,
            statusShadow: cfg.shadow,
            statusBg: cfg.bg,
          },
        })
        .catch((err) =>
          this.logger.warn(
            `Email statut admin non envoyé à ${recipient.email}: ${err.message}`,
          ),
        );
    }

    if (adminRecipients.length) {
      this.logger.log(
        `📧 Email statut (${newStatus}) envoyé à ${adminRecipients.length} admin(s)`,
      );
    }
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

  async findByTeam(teamId: string): Promise<any[]> {
    const invoices = await this.invoiceRepo.findAll({
      filter: {
        'cartSnapshot.items.product.team._id': new Types.ObjectId(teamId),
        deleted_at: { $exists: false },
      },
      options: { sort: { invoiceDate: -1 }, populate: this.populateOptions },
    });

    return invoices.map((invoice) =>
      this.formatInvoiceResponseForTeam(invoice, teamId),
    );
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
      deliveryMethod: invoice.deliveryMethod,
      deliveryAddressId: invoice.deliveryAddressId,
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

  private formatInvoiceResponseForTeam(invoice: any, teamId: string): any {
    const base = this.formatInvoiceResponse(invoice);

    const teamItems = (base.cart?.items ?? []).filter(
      (item: any) => item.product?.team?._id?.toString() === teamId,
    );

    const subtotalRaw = teamItems.reduce(
      (sum: number, item: any) =>
        sum + (item.price ?? 0) * (item.quantity ?? 1),
      0,
    );

    return {
      ...base,
      cart: {
        ...base.cart,
        items: teamItems,
      },
      teamSummary: {
        teamId,
        itemCount: teamItems.length,
        subtotal: this.formatAmount(subtotalRaw),
        subtotalRaw,
      },
    };
  }

  async remove(id: string): Promise<void> {
    // Récupérer le document formaté AVANT le soft-delete
    const fullInvoice = await this.findOne(id);

    await this.invoiceRepo.update({ id, update: { deleted_at: new Date() } });
    this.logger.log(
      `Facture ${fullInvoice.invoiceNumber} supprimée (soft delete)`,
    );

    const customerEmail = fullInvoice.customer?.email;
    if (customerEmail) {
      const deletedAt = new Date();
      this.notificationService
        .sendEmail({
          to: customerEmail,
          subject: `Suppression de la facture ${fullInvoice.invoiceNumber}`,
          template: 'invoice-deleted',
          locale: 'fr',
          context: {
            user: {
              name: fullInvoice.customer?.name ?? 'Client',
              email: customerEmail,
            },
            invoice: {
              number: fullInvoice.invoiceNumber,
              amount: this.formatAmount(fullInvoice.payment?.amount ?? 0),
              currency: fullInvoice.payment?.currency?.toUpperCase() ?? 'MGA',
              deletedAt: deletedAt.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            },
          },
        })
        .catch((err) =>
          this.logger.warn(
            `Email suppression non envoyé pour ${fullInvoice.invoiceNumber}: ${err.message}`,
          ),
        );
    }
  }
}
