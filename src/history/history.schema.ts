import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HistoryDocument = History & Document;

// ══════════════════════════════════════════════════════════════
// ACTIONS GÉNÉRIQUES
// ══════════════════════════════════════════════════════════════

export enum HistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  RESTORED = 'restored',

  // Actions métier spécifiques
  STATUS_CHANGED = 'status_changed',
  PAYMENT_RECEIVED = 'payment_received',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  EXPORTED = 'exported',
  SENT = 'sent',
}

// ══════════════════════════════════════════════════════════════
// ENTITÉS TRAÇABLES
// Ajouter ici toute nouvelle entité à historiser
// ══════════════════════════════════════════════════════════════

export enum HistoryEntityType {
  INVOICE = 'Invoice',
  PAYMENT = 'Payment',
  USER = 'User',
  PRODUCT = 'Product',
  CART = 'Cart',
  ADDRESS = 'Address',
  PROMO_CODE = 'PromoCode',
  PRICING_RULE = 'PricingRule',
  TEAM = 'Team',
}

// ══════════════════════════════════════════════════════════════
// SCHÉMA PRINCIPAL
// ══════════════════════════════════════════════════════════════

@Schema({ timestamps: true, collection: 'histories' })
export class History {
  // ── Cible ────────────────────────────────────────────────────

  /** Type de l'entité concernée (ex: 'Invoice', 'User') */
  @Prop({
    required: true,
    type: String,
    enum: Object.values(HistoryEntityType),
    index: true,
  })
  entityType: HistoryEntityType;

  /** ID du document concerné */
  @Prop({ required: true, type: Types.ObjectId, index: true })
  entityId: Types.ObjectId;

  /** Référence humaine lisible (ex: numéro de facture, email, nom) */
  @Prop({ required: false, type: String })
  entityLabel?: string;

  // ── Action ───────────────────────────────────────────────────

  @Prop({
    required: true,
    type: String,
    enum: Object.values(HistoryAction),
    index: true,
  })
  action: HistoryAction;

  // ── Acteur ───────────────────────────────────────────────────

  /** Utilisateur qui a effectué l'action (null = action système) */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  performedBy?: Types.ObjectId;

  /** Indique si l'action a été effectuée par le système (cron, webhook, etc.) */
  @Prop({ type: Boolean, default: false })
  isSystemAction: boolean;

  // ── Horodatage ───────────────────────────────────────────────

  @Prop({ required: true, default: () => new Date(), index: true })
  performedAt: Date;

  // ── Diff ─────────────────────────────────────────────────────

  /** Snapshot de l'entité AVANT la modification */
  @Prop({ required: false, type: Object })
  previousValue?: Record<string, any>;

  /** Snapshot de l'entité APRÈS la modification */
  @Prop({ required: false, type: Object })
  newValue?: Record<string, any>;

  /** Liste des champs qui ont changé (pour les actions UPDATED) */
  @Prop({ required: false, type: [String], default: [] })
  changedFields?: string[];

  // ── Contexte ─────────────────────────────────────────────────

  /** Données contextuelles libres (IP, user-agent, raison, etc.) */
  @Prop({ required: false, type: Object })
  metadata?: Record<string, any>;

  /** Adresse IP de l'acteur */
  @Prop({ required: false, type: String })
  ipAddress?: string;

  /** User-agent du navigateur / client */
  @Prop({ required: false, type: String })
  userAgent?: string;
}

export const HistorySchema = SchemaFactory.createForClass(History);

// ══════════════════════════════════════════════════════════════
// INDEX
// ══════════════════════════════════════════════════════════════

/** Retrouver tout l'historique d'un document précis */
HistorySchema.index({ entityType: 1, entityId: 1, performedAt: -1 });

/** Retrouver toutes les actions d'un utilisateur */
HistorySchema.index({ performedBy: 1, performedAt: -1 });

/** Filtrer par type d'action sur une entité */
HistorySchema.index({ entityType: 1, action: 1, performedAt: -1 });

/** Audit global chronologique */
HistorySchema.index({ performedAt: -1 });
