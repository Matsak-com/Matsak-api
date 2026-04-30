import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(doc: Partial<AuditLogDocument>): Promise<AuditLogDocument> {
    const created = new this.auditLogModel(doc);
    return created.save();
  }

  async findById(id: string): Promise<AuditLogDocument | null> {
    return this.auditLogModel.findById(id).exec();
  }

  async findPaginated({
    filter = {},
    page = 1,
    limit = 50,
    sort = { createdAt: -1 },
  }: {
    filter?: FilterQuery<AuditLogDocument>;
    page?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
  }) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getStats(teamId?: string) {
    const matchStage = teamId
      ? { $match: { teamId: new Types.ObjectId(teamId) } }
      : { $match: {} };

    const [actionStats, resourceStats, actorStats, dailyActivity] =
      await Promise.all([
        // Actions breakdown
        this.auditLogModel.aggregate([
          matchStage,
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Resources breakdown
        this.auditLogModel.aggregate([
          matchStage,
          { $group: { _id: '$resource', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Top actors
        this.auditLogModel.aggregate([
          matchStage,
          { $match: { actorId: { $ne: null } } },
          {
            $group: {
              _id: '$actorId',
              email: { $first: '$actorEmail' },
              role: { $first: '$actorRole' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),

        // Daily activity last 30 days
        this.auditLogModel.aggregate([
          matchStage,
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
              failures: {
                $sum: { $cond: [{ $eq: ['$status', 'FAILURE'] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    return { actionStats, resourceStats, actorStats, dailyActivity };
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.auditLogModel.deleteMany({
      createdAt: { $lt: date },
    });
    return result.deletedCount;
  }
}
