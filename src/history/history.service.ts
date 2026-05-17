import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  History,
  HistoryAction,
  HistoryEntityType,
  HistoryDocument,
} from './history.schema';

export interface RecordHistoryOptions {
  entityType: HistoryEntityType;
  entityId: Types.ObjectId | string;
  entityLabel?: string;
  action: HistoryAction;
  performedBy?: Types.ObjectId | string;
  isSystemAction?: boolean;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changedFields?: string[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectModel(History.name)
    private readonly historyModel: Model<HistoryDocument>,
  ) {}

  // ══════════════════════════════════════════════════════════════
  // ENREGISTREMENT
  // ══════════════════════════════════════════════════════════════

  /**
   * Enregistre une entrée d'historique.
   * Fire-and-forget possible via recordAsync().
   */
  async record(opts: RecordHistoryOptions): Promise<void> {
    try {
      await this.historyModel.create({
        entityType: opts.entityType,
        entityId:
          typeof opts.entityId === 'string'
            ? new Types.ObjectId(opts.entityId)
            : opts.entityId,
        entityLabel: opts.entityLabel,
        action: opts.action,
        performedBy: opts.performedBy
          ? typeof opts.performedBy === 'string'
            ? new Types.ObjectId(opts.performedBy)
            : opts.performedBy
          : undefined,
        isSystemAction: opts.isSystemAction ?? false,
        performedAt: new Date(),
        previousValue: opts.previousValue,
        newValue: opts.newValue,
        changedFields: opts.changedFields ?? [],
        metadata: opts.metadata,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
      });
    } catch (err) {
      // L'historique ne doit jamais faire planter l'opération principale
      this.logger.error(
        `Échec enregistrement historique [${opts.entityType}:${opts.entityId}] action=${opts.action}`,
        err?.message,
      );
    }
  }

  /**
   * Fire-and-forget — ne bloque pas l'appelant.
   * Idéal dans les services métier.
   */
  recordAsync(opts: RecordHistoryOptions): void {
    this.record(opts).catch(() => {
      // Déjà loggué dans record()
    });
  }

  // ══════════════════════════════════════════════════════════════
  // HELPERS — diff automatique
  // ══════════════════════════════════════════════════════════════

  /**
   * Compare deux objets et retourne la liste des clés dont la valeur a changé.
   * Utile pour remplir changedFields automatiquement.
   */
  diffFields(
    previous: Record<string, any>,
    next: Record<string, any>,
  ): string[] {
    const allKeys = new Set([
      ...Object.keys(previous),
      ...Object.keys(next),
    ]);
    const changed: string[] = [];

    for (const key of allKeys) {
      const prev = JSON.stringify(previous[key]);
      const curr = JSON.stringify(next[key]);
      if (prev !== curr) changed.push(key);
    }
    return changed;
  }

  // ══════════════════════════════════════════════════════════════
  // LECTURE
  // ══════════════════════════════════════════════════════════════

  async findByEntity(
    entityType: HistoryEntityType,
    entityId: string,
  ): Promise<History[]> {
    return this.historyModel
      .find({
        entityType,
        entityId: new Types.ObjectId(entityId),
      })
      .sort({ performedAt: -1 })
      .lean();
  }

  async findByUser(userId: string): Promise<History[]> {
    return this.historyModel
      .find({ performedBy: new Types.ObjectId(userId) })
      .sort({ performedAt: -1 })
      .lean();
  }

  async findAll(filters?: {
    entityType?: HistoryEntityType;
    action?: HistoryAction;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<History[]> {
    const query: Record<string, any> = {};

    if (filters?.entityType) query.entityType = filters.entityType;
    if (filters?.action) query.action = filters.action;
    if (filters?.from || filters?.to) {
      query.performedAt = {};
      if (filters.from) query.performedAt.$gte = filters.from;
      if (filters.to) query.performedAt.$lte = filters.to;
    }

    return this.historyModel
      .find(query)
      .sort({ performedAt: -1 })
      .limit(filters?.limit ?? 100)
      .lean();
  }
}