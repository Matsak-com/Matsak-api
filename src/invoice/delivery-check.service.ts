import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import {
  DeliveryCheck,
  DeliveryCheckDocument,
  DeliveryCheckType,
} from './delivery-check.schema';
import { ERRORS } from '../common/errors';
import { NotificationService } from '../notifications/notification.service';
import { I18nService, SupportedLocale } from '../notifications/i18n.service';
import { Invoice, InvoiceDocument } from './invoice.schema';
import { User } from '../users/user.schema';

// ─── Internal types ──────────────────────────────────────────────────────────

export interface CreateDeliveryCheckParams {
  invoiceId: Types.ObjectId;
  invoiceNumber: string;
  type: DeliveryCheckType;
  items: Array<{
    productId: Types.ObjectId;
    name: string;
    quantity: number;
  }>;
  /** Required for PICKUP checks; identifies the pharmacy team. */
  teamId?: Types.ObjectId;
}

interface DeliveryTokenPayload {
  /** MongoDB _id of the DeliveryCheck document */
  sub: string;
  /** Invoice number — for human-readable audit logs only */
  inv: string;
  /** DELIVERY or PICKUP */
  type: DeliveryCheckType;
  /** Unique token ID — prevents replay of an identical payload */
  jti: string;
}

// ─── Public response shape ───────────────────────────────────────────────────

export interface DeliveryItemResponse {
  productId: string;
  name: string;
  quantity: number;
  checked: boolean;
  checkedAt: Date | null;
  checkedBy: string | null;
}

export interface DeliveryCheckResponse {
  deliveryCheckId: string;
  invoiceNumber: string;
  type: DeliveryCheckType;
  teamId: string | null;
  completedAt: Date | null;
  expiresAt: Date;
  items: DeliveryItemResponse[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Manages signed delivery-verification tokens and their associated checklists.
 *
 * ### Security model
 * - Each QR code embeds a short-lived JWT (7 days) signed with
 *   `DELIVERY_QR_SECRET` — a **dedicated** secret separate from `JWT_SECRET`.
 * - The JWT payload contains only the DeliveryCheck `_id` (no PII).
 * - Only the SHA-256 hash of the raw token is persisted, so a DB breach
 *   cannot be used to forge or replay a token.
 * - An admin can hard-revoke a token by setting `revoked = true`.
 */
@Injectable()
export class DeliveryCheckService {
  private readonly logger = new Logger(DeliveryCheckService.name);
  /** Lifetime of a delivery QR token in days. */
  private static readonly TTL_DAYS = 7;

  constructor(
    @InjectModel(DeliveryCheck.name)
    private readonly model: Model<DeliveryCheckDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly i18nService: I18nService,
  ) {}

  // ── Secret ─────────────────────────────────────────────────────────────────

  /**
   * Returns the signing secret for delivery tokens.
   * Falls back to JWT_SECRET with a `:delivery` suffix so even without a
   * dedicated env var the tokens are cryptographically distinct from auth JWTs.
   */
  private get secret(): string {
    const dedicated = process.env.DELIVERY_QR_SECRET;
    if (dedicated) return dedicated;
    // Fallback — distinct namespace even when sharing the base secret
    const base = process.env.JWT_SECRET;
    if (!base) throw new Error('JWT_SECRET is not set');
    return `${base}:delivery`;
  }

  // ── Token creation ─────────────────────────────────────────────────────────

  /**
   * Creates a DeliveryCheck record and returns a signed JWT to embed in the QR.
   * The token is **not** stored — only its SHA-256 hash is persisted.
   */
  async createDeliveryToken(
    params: CreateDeliveryCheckParams,
  ): Promise<string> {
    if (!params.items.length) {
      throw new BadRequestException(ERRORS.DELIVERY_ITEMS_REQUIRED);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DeliveryCheckService.TTL_DAYS);

    // Pre-generate the document _id so we can embed it in the JWT payload
    // before the DB write — avoids a two-phase update.
    const docId = new Types.ObjectId();
    const jti = crypto.randomUUID();

    const payload: DeliveryTokenPayload = {
      sub: docId.toString(),
      inv: params.invoiceNumber,
      type: params.type,
      jti,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: `${DeliveryCheckService.TTL_DAYS}d`,
    });

    const tokenHash = this.hashToken(token);

    await new this.model({
      _id: docId,
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      teamId: params.teamId,
      type: params.type,
      tokenHash,
      items: params.items,
      expiresAt,
    }).save();

    this.logger.log(
      `✅ DeliveryCheck créé pour facture ${params.invoiceNumber} [${params.type}]`,
    );

    return token;
  }

  // ── Token verification ─────────────────────────────────────────────────────

  /**
   * Validates the JWT, verifies the stored hash, checks revocation and expiry.
   * Throws a descriptive HTTP exception on any failure — never leaks internals.
   */
  async verifyToken(token: string): Promise<DeliveryCheckDocument> {
    let payload: DeliveryTokenPayload;
    try {
      payload = this.jwtService.verify<DeliveryTokenPayload>(token, {
        secret: this.secret,
      });
    } catch (err: any) {
      // Map JWT errors to distinct codes without leaking internals
      if (err?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(ERRORS.DELIVERY_QR_EXPIRED);
      }
      throw new UnauthorizedException(ERRORS.DELIVERY_QR_INVALID);
    }

    const doc = await this.model.findById(payload.sub).exec();
    if (!doc) {
      throw new NotFoundException(ERRORS.DELIVERY_CHECK_NOT_FOUND);
    }

    if (doc.revoked) {
      throw new ForbiddenException(ERRORS.DELIVERY_QR_REVOKED);
    }

    if (doc.expiresAt < new Date()) {
      throw new UnauthorizedException(ERRORS.DELIVERY_QR_EXPIRED);
    }

    const tokenHash = this.hashToken(token);
    // Constant-length string comparison to mitigate timing attacks
    if (!this.safeEqual(doc.tokenHash, tokenHash)) {
      throw new UnauthorizedException(ERRORS.DELIVERY_QR_INVALID);
    }

    return doc;
  }

  // ── Checklist operations ───────────────────────────────────────────────────

  /**
   * Marks a single item as checked.
   * Uses atomic MongoDB operations to prevent concurrent-update races.
   * Auto-completes the entire delivery if all items are now checked.
   */
  async checkItem(
    token: string,
    productId: string,
    checkerName?: string,
  ): Promise<DeliveryCheckResponse> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('productId invalide');
    }

    const doc = await this.verifyToken(token);

    if (doc.completedAt) {
      throw new ForbiddenException(ERRORS.DELIVERY_CHECK_ALREADY_COMPLETED);
    }

    const item = doc.items.find((i) => i.productId.toString() === productId);
    if (!item) {
      throw new NotFoundException(ERRORS.DELIVERY_PRODUCT_NOT_FOUND);
    }

    const checkedAt = new Date();
    const checkedBy = checkerName?.trim() || 'Livreur';

    // Atomic update using positional operator — safe under concurrent requests.
    const updateResult = await this.model.updateOne(
      {
        _id: doc._id,
        completedAt: null,
        'items.productId': new Types.ObjectId(productId),
      },
      {
        $set: {
          'items.$.checkedAt': checkedAt,
          'items.$.checkedBy': checkedBy,
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      throw new ForbiddenException(ERRORS.DELIVERY_CHECK_ALREADY_COMPLETED);
    }

    // Re-fetch the fresh document to compute completion state.
    let freshDoc = await this.model.findById(doc._id);
    if (!freshDoc) {
      throw new NotFoundException(ERRORS.DELIVERY_PRODUCT_NOT_FOUND);
    }

    const allChecked = freshDoc.items.every((i) => !!i.checkedAt);
    if (allChecked && !freshDoc.completedAt) {
      // Atomic completion — only one concurrent caller will win this update.
      const completedDoc = await this.model.findOneAndUpdate(
        { _id: freshDoc._id, completedAt: null },
        { $set: { completedAt: new Date() } },
        { new: true },
      );

      if (completedDoc) {
        freshDoc = completedDoc;
        this.logger.log(
          `✅ Livraison complète (auto) pour facture ${freshDoc.invoiceNumber}`,
        );
      } else {
        // Another concurrent request already completed it — reload the latest state.
        const reloadedDoc = await this.model.findById(doc._id);
        if (reloadedDoc) {
          freshDoc = reloadedDoc;
        }
      }
    }

    if (freshDoc.completedAt) {
      this.sendDeliveryConfirmationEmail(freshDoc).catch((err) =>
        this.logger.error(
          `Échec envoi email confirmation livraison ${freshDoc.invoiceNumber}`,
          err.stack,
        ),
      );
    }

    return this.toResponse(freshDoc);
  }

  /**
   * Marks all remaining unchecked items and closes the delivery.
   */
  async completeDelivery(
    token: string,
    checkerName?: string,
  ): Promise<DeliveryCheckResponse> {
    const doc = await this.verifyToken(token);

    if (doc.completedAt) {
      throw new ForbiddenException(ERRORS.DELIVERY_CHECK_ALREADY_COMPLETED);
    }

    const now = new Date();
    const resolvedName = checkerName?.trim() || 'Livreur';

    doc.items.forEach((item) => {
      if (!item.checkedAt) {
        item.checkedAt = now;
        item.checkedBy = resolvedName;
      }
    });
    doc.completedAt = now;
    doc.markModified('items');

    await doc.save();

    this.logger.log(
      `✅ Livraison clôturée manuellement pour facture ${doc.invoiceNumber}`,
    );

    this.sendDeliveryConfirmationEmail(doc).catch((err) =>
      this.logger.error(
        `Échec envoi email confirmation livraison ${doc.invoiceNumber}`,
        err.stack,
      ),
    );

    return this.toResponse(doc);
  }

  /** Returns the current state of a delivery checklist without mutating it. */
  async getDeliveryCheck(token: string): Promise<DeliveryCheckResponse> {
    const doc = await this.verifyToken(token);
    return this.toResponse(doc);
  }

  /**
   * Hard-revokes a token.  Requires admin caller — the controller is
   * responsible for enforcing the role check.
   */
  async revokeToken(token: string): Promise<void> {
    const doc = await this.verifyToken(token);
    doc.revoked = true;
    await doc.save();
    this.logger.warn(
      `⚠️  QR livraison révoqué pour facture ${doc.invoiceNumber}`,
    );
  }

  // ── Email ──────────────────────────────────────────────────────────────────

  /**
   * Fire-and-forget: sends a delivery confirmation email to the customer.
   * Resolves the customer via Invoice → userId → User, then builds a rich
   * context including order date, pricing summary and delivery address.
   */
  private async sendDeliveryConfirmationEmail(
    doc: DeliveryCheckDocument,
  ): Promise<void> {
    // ── 1) Fetch invoice with full pricing & snapshot ──────────────────────
    const invoice = await this.invoiceModel
      .findById(doc.invoiceId)
      .select(
        'userId invoiceNumber invoiceDate deliveryAddressId currency ' +
          'subtotalLocal surchargesTotalLocal discountLocal pricingLines ' +
          'promoCodeSnapshot totalLocal cartSnapshot',
      )
      .lean<any>();

    if (!invoice?.userId) {
      this.logger.warn(
        `Pas d'userId sur la facture ${doc.invoiceNumber} — email non envoyé`,
      );
      return;
    }

    // ── 2) Fetch user with locale & addresses ──────────────────────────────
    const user = await this.userModel
      .findById(invoice.userId)
      .select('name firstname email locale addresses')
      .lean<any>();

    if (!user?.email) {
      this.logger.warn(
        `Pas d'email client pour la facture ${doc.invoiceNumber} — email non envoyé`,
      );
      return;
    }

    // ── 3) Resolve locale ──────────────────────────────────────────────────
    const VALID_LOCALES = ['fr', 'en', 'zh', 'ar'] as const;
    type Locale = (typeof VALID_LOCALES)[number];
    const locale: Locale = VALID_LOCALES.includes(user.locale)
      ? (user.locale as Locale)
      : 'fr';
    const DATE_LOCALES: Record<Locale, string> = {
      fr: 'fr-FR',
      en: 'en-GB',
      zh: 'zh-CN',
      ar: 'ar-MA',
    };
    const dateLocale = DATE_LOCALES[locale];

    // ── 4) Format dates ────────────────────────────────────────────────────
    const completedAt = doc.completedAt
      ? new Date(doc.completedAt).toLocaleString(dateLocale, {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

    const invoiceDate = invoice.invoiceDate
      ? new Date(invoice.invoiceDate).toLocaleDateString(dateLocale, {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '-';

    // ── 5) Resolve delivery address (embedded in User.addresses) ──────────
    let deliveryAddress: Record<string, string> | null = null;
    if (invoice.deliveryAddressId && Array.isArray(user.addresses)) {
      const addr = user.addresses.find(
        (a: any) => a._id?.toString() === invoice.deliveryAddressId?.toString(),
      );
      if (addr) {
        deliveryAddress = {
          name: [addr.firstName, addr.lastName].filter(Boolean).join(' '),
          addressLine: addr.addressLine ?? '',
          city: addr.city ?? '',
          ...(addr.state ? { state: addr.state } : {}),
          ...(addr.phone ? { phone: addr.phone } : {}),
          ...(addr.deliveryNotes ? { deliveryNotes: addr.deliveryNotes } : {}),
        };
      }
    }

    // ── 6) Team name(s) from cartSnapshot (PICKUP only) ───────────────────
    let teamName: string | null = null;
    if (
      doc.type === DeliveryCheckType.PICKUP &&
      Array.isArray(invoice.cartSnapshot?.items)
    ) {
      const seen = new Set<string>();
      const names: string[] = [];
      for (const item of invoice.cartSnapshot.items) {
        const tn: string | undefined = item.product?.team?.name;
        if (tn && !seen.has(tn)) {
          seen.add(tn);
          names.push(tn);
        }
      }
      if (names.length) teamName = names.join(', ');
    }

    // ── 7) Pricing ─────────────────────────────────────────────────────────
    const currency: string = invoice.currency ?? 'MGA';
    const fmt = (n: unknown): string =>
      (Math.round(((n as number) ?? 0) * 100) / 100).toLocaleString(dateLocale);

    const pricingLines: Array<{ name: string; localPrice: string }> = (
      invoice.pricingLines ?? []
    ).map((l: any) => ({ name: l.name, localPrice: fmt(l.localPrice) }));

    const hasDiscount = (invoice.discountLocal ?? 0) > 0;

    // ── 8) Last checker name ───────────────────────────────────────────────
    const lastChecker = doc.items
      .filter((i) => i.checkedBy)
      .map((i) => i.checkedBy)
      .pop();

    // ── 9) Build context ───────────────────────────────────────────────────
    const context = {
      customer: {
        name: user.name ?? '',
        firstname: user.firstname ?? '',
        fullName:
          [user.firstname, user.name].filter(Boolean).join(' ') || 'Client',
      },
      invoiceNumber: doc.invoiceNumber,
      invoiceDate,
      type: doc.type,
      isDelivery: doc.type === DeliveryCheckType.DELIVERY,
      isPickup: doc.type === DeliveryCheckType.PICKUP,
      teamName,
      deliveryAddress,
      completedAt,
      checkedBy: lastChecker ?? null,
      itemCount: doc.items.length,
      currency,
      subtotalLocal: fmt(invoice.subtotalLocal),
      pricingLines,
      hasDiscount,
      discountLocal: fmt(invoice.discountLocal),
      promoCodeSnapshot: invoice.promoCodeSnapshot ?? null,
      totalLocal: fmt(invoice.totalLocal),
      items: doc.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        checkedBy: item.checkedBy ?? '-',
        checkedAt: item.checkedAt
          ? new Date(item.checkedAt).toLocaleTimeString(dateLocale, {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
      })),
    };

    const subject =
      this.i18nService.translate(
        'email.deliveryConfirmed.subject',
        locale as SupportedLocale,
        { invoiceNumber: doc.invoiceNumber },
      ) || `Livraison confirmée — Facture ${doc.invoiceNumber}`;

    await this.notificationService.sendEmail({
      to: user.email,
      subject,
      template: 'delivery-confirmed',
      context,
      locale,
    });

    this.logger.log(
      `📧 Email confirmation livraison envoyé à ${user.email} (facture ${doc.invoiceNumber})`,
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing-based attacks.
   * Falls back gracefully when lengths differ (early exit is unavoidable there,
   * but since both are SHA-256 hex strings they are always 64 chars).
   */
  private safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    return crypto.timingSafeEqual(bufA, bufB);
  }

  private toResponse(doc: DeliveryCheckDocument): DeliveryCheckResponse {
    return {
      deliveryCheckId: doc._id.toString(),
      invoiceNumber: doc.invoiceNumber,
      type: doc.type,
      teamId: doc.teamId?.toString() ?? null,
      completedAt: doc.completedAt ?? null,
      expiresAt: doc.expiresAt,
      items: doc.items.map((item) => ({
        productId: item.productId.toString(),
        name: item.name,
        quantity: item.quantity,
        checked: !!item.checkedAt,
        checkedAt: item.checkedAt ?? null,
        checkedBy: item.checkedBy ?? null,
      })),
    };
  }
}
