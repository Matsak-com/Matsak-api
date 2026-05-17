import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HistoryService } from './history.service';
import { History, HistoryAction, HistoryEntityType } from './history.schema';

describe('HistoryService', () => {
  let service: HistoryService;
  let historyModel: {
    create: jest.Mock;
    find: jest.Mock;
  };

  const mockEntityId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439012');

  const mockHistoryEntry = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
    entityType: HistoryEntityType.INVOICE,
    entityId: mockEntityId,
    entityLabel: 'INV-2024-001',
    action: HistoryAction.CREATED,
    performedBy: mockUserId,
    isSystemAction: false,
    performedAt: new Date('2024-01-15'),
    previousValue: null,
    newValue: { status: 'PAID' },
    changedFields: [],
    metadata: {},
  };

  // Helper : chaîne fluente find().sort().limit().lean()
  const mockFindChain = (result: any[]) => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    };
    historyModel.find.mockReturnValue(chain);
    return chain;
  };

  beforeEach(async () => {
    historyModel = {
      create: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        {
          provide: getModelToken(History.name),
          useValue: historyModel,
        },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  // ─── record ───────────────────────────────────────────────────────────────

  describe('record', () => {
    const baseOpts = {
      entityType: HistoryEntityType.INVOICE,
      entityId: mockEntityId,
      entityLabel: 'INV-2024-001',
      action: HistoryAction.CREATED,
    };

    it('should create a history entry with all provided fields', async () => {
      historyModel.create.mockResolvedValue(mockHistoryEntry);

      await service.record({
        ...baseOpts,
        performedBy: mockUserId,
        isSystemAction: false,
        previousValue: { status: 'PENDING' },
        newValue: { status: 'PAID' },
        changedFields: ['status'],
        metadata: { paymentId: 'abc' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(historyModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: HistoryEntityType.INVOICE,
          entityId: mockEntityId,
          entityLabel: 'INV-2024-001',
          action: HistoryAction.CREATED,
          performedBy: mockUserId,
          isSystemAction: false,
          performedAt: expect.any(Date),
          previousValue: { status: 'PENDING' },
          newValue: { status: 'PAID' },
          changedFields: ['status'],
          metadata: { paymentId: 'abc' },
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }),
      );
    });

    it('should convert string entityId to ObjectId', async () => {
      historyModel.create.mockResolvedValue(mockHistoryEntry);

      await service.record({
        ...baseOpts,
        entityId: mockEntityId.toString(),
      });

      const call = historyModel.create.mock.calls[0][0];
      expect(call.entityId).toBeInstanceOf(Types.ObjectId);
      expect(call.entityId.toString()).toBe(mockEntityId.toString());
    });

    it('should convert string performedBy to ObjectId', async () => {
      historyModel.create.mockResolvedValue(mockHistoryEntry);

      await service.record({
        ...baseOpts,
        performedBy: mockUserId.toString(),
      });

      const call = historyModel.create.mock.calls[0][0];
      expect(call.performedBy).toBeInstanceOf(Types.ObjectId);
      expect(call.performedBy.toString()).toBe(mockUserId.toString());
    });

    it('should set performedBy to undefined when not provided', async () => {
      historyModel.create.mockResolvedValue(mockHistoryEntry);

      await service.record(baseOpts);

      const call = historyModel.create.mock.calls[0][0];
      expect(call.performedBy).toBeUndefined();
    });

    it('should default isSystemAction to false when not provided', async () => {
      historyModel.create.mockResolvedValue(mockHistoryEntry);

      await service.record(baseOpts);

      const call = historyModel.create.mock.calls[0][0];
      expect(call.isSystemAction).toBe(false);
    });

    it('should default changedFields to empty array when not provided', async () => {
      historyModel.create.mockResolvedValue(mockHistoryEntry);

      await service.record(baseOpts);

      const call = historyModel.create.mock.calls[0][0];
      expect(call.changedFields).toEqual([]);
    });

    it('should not throw when historyModel.create fails (swallows error)', async () => {
      historyModel.create.mockRejectedValue(new Error('DB unavailable'));

      await expect(service.record(baseOpts)).resolves.toBeUndefined();
    });

    it('should log error when historyModel.create fails', async () => {
      const loggerSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => {});
      historyModel.create.mockRejectedValue(new Error('DB unavailable'));

      await service.record(baseOpts);

      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  // ─── recordAsync ──────────────────────────────────────────────────────────

  describe('recordAsync', () => {
    const baseOpts = {
      entityType: HistoryEntityType.INVOICE,
      entityId: mockEntityId,
      action: HistoryAction.CREATED,
    };

    it('should call record() without awaiting (fire-and-forget)', () => {
      historyModel.create.mockResolvedValue({});
      const recordSpy = jest.spyOn(service, 'record');

      service.recordAsync(baseOpts);

      // L'appel est synchrone — record() est déclenché immédiatement
      expect(recordSpy).toHaveBeenCalledWith(baseOpts);
    });

    it('should not throw even when record() rejects', async () => {
      historyModel.create.mockRejectedValue(new Error('DB failure'));

      expect(() => service.recordAsync(baseOpts)).not.toThrow();

      // Laisser les micro-tâches se résoudre pour éviter une UnhandledPromiseRejection
      await new Promise(process.nextTick);
    });

    it('should return void synchronously', () => {
      historyModel.create.mockResolvedValue({});
      const result = service.recordAsync(baseOpts);
      expect(result).toBeUndefined();
    });
  });

  // ─── diffFields ───────────────────────────────────────────────────────────

  describe('diffFields', () => {
    it('should return changed fields between two objects', () => {
      const previous = { status: 'PENDING', amount: 100 };
      const next = { status: 'PAID', amount: 100 };

      const result = service.diffFields(previous, next);

      expect(result).toEqual(['status']);
    });

    it('should return all fields when everything changed', () => {
      const previous = { status: 'PENDING', amount: 100 };
      const next = { status: 'PAID', amount: 200 };

      const result = service.diffFields(previous, next);

      expect(result).toHaveLength(2);
      expect(result).toContain('status');
      expect(result).toContain('amount');
    });

    it('should return empty array when objects are identical', () => {
      const obj = { status: 'PAID', amount: 100 };

      const result = service.diffFields(obj, { ...obj });

      expect(result).toEqual([]);
    });

    it('should detect added fields (key present in next but not in previous)', () => {
      const previous = { status: 'PENDING' };
      const next = { status: 'PENDING', refundedAt: new Date('2024-01-15') };

      const result = service.diffFields(previous, next);

      expect(result).toContain('refundedAt');
    });

    it('should detect removed fields (key present in previous but not in next)', () => {
      const previous = { status: 'PAID', refundedAt: new Date('2024-01-15') };
      const next = { status: 'PAID' };

      const result = service.diffFields(previous, next);

      expect(result).toContain('refundedAt');
    });

    it('should detect nested object changes via JSON serialization', () => {
      const previous = { address: { city: 'Paris' } };
      const next = { address: { city: 'Lyon' } };

      const result = service.diffFields(previous, next);

      expect(result).toContain('address');
    });

    it('should not flag fields as changed when nested objects are equal', () => {
      const previous = { address: { city: 'Paris' } };
      const next = { address: { city: 'Paris' } };

      const result = service.diffFields(previous, next);

      expect(result).toEqual([]);
    });
  });

  // ─── findByEntity ─────────────────────────────────────────────────────────

  describe('findByEntity', () => {
    it('should query by entityType and entityId, sorted desc', async () => {
      const chain = mockFindChain([mockHistoryEntry]);

      const result = await service.findByEntity(
        HistoryEntityType.INVOICE,
        mockEntityId.toString(),
      );

      expect(historyModel.find).toHaveBeenCalledWith({
        entityType: HistoryEntityType.INVOICE,
        entityId: expect.any(Types.ObjectId),
      });
      const findArg = historyModel.find.mock.calls[0][0];
      expect(findArg.entityId.toString()).toBe(mockEntityId.toString());
      expect(chain.sort).toHaveBeenCalledWith({ performedAt: -1 });
      expect(result).toEqual([mockHistoryEntry]);
    });

    it('should return empty array when no history found', async () => {
      mockFindChain([]);

      const result = await service.findByEntity(
        HistoryEntityType.INVOICE,
        mockEntityId.toString(),
      );

      expect(result).toEqual([]);
    });
  });

  // ─── findByUser ───────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('should query by performedBy userId, sorted desc', async () => {
      const chain = mockFindChain([mockHistoryEntry]);

      const result = await service.findByUser(mockUserId.toString());

      expect(historyModel.find).toHaveBeenCalledWith({
        performedBy: expect.any(Types.ObjectId),
      });
      const findArg = historyModel.find.mock.calls[0][0];
      expect(findArg.performedBy.toString()).toBe(mockUserId.toString());
      expect(chain.sort).toHaveBeenCalledWith({ performedAt: -1 });
      expect(result).toEqual([mockHistoryEntry]);
    });

    it('should return empty array when user has no history', async () => {
      mockFindChain([]);

      const result = await service.findByUser(mockUserId.toString());

      expect(result).toEqual([]);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all entries with default limit 100 when no filters provided', async () => {
      const chain = mockFindChain([mockHistoryEntry]);

      const result = await service.findAll();

      expect(historyModel.find).toHaveBeenCalledWith({});
      expect(chain.sort).toHaveBeenCalledWith({ performedAt: -1 });
      expect(chain.limit).toHaveBeenCalledWith(100);
      expect(result).toEqual([mockHistoryEntry]);
    });

    it('should filter by entityType when provided', async () => {
      mockFindChain([mockHistoryEntry]);

      await service.findAll({ entityType: HistoryEntityType.INVOICE });

      const query = historyModel.find.mock.calls[0][0];
      expect(query.entityType).toBe(HistoryEntityType.INVOICE);
    });

    it('should filter by action when provided', async () => {
      mockFindChain([mockHistoryEntry]);

      await service.findAll({ action: HistoryAction.CREATED });

      const query = historyModel.find.mock.calls[0][0];
      expect(query.action).toBe(HistoryAction.CREATED);
    });

    it('should filter by date range when from and to provided', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      mockFindChain([mockHistoryEntry]);

      await service.findAll({ from, to });

      const query = historyModel.find.mock.calls[0][0];
      expect(query.performedAt.$gte).toEqual(from);
      expect(query.performedAt.$lte).toEqual(to);
    });

    it('should filter by from only when to is not provided', async () => {
      const from = new Date('2024-01-01');
      mockFindChain([]);

      await service.findAll({ from });

      const query = historyModel.find.mock.calls[0][0];
      expect(query.performedAt.$gte).toEqual(from);
      expect(query.performedAt.$lte).toBeUndefined();
    });

    it('should filter by to only when from is not provided', async () => {
      const to = new Date('2024-01-31');
      mockFindChain([]);

      await service.findAll({ to });

      const query = historyModel.find.mock.calls[0][0];
      expect(query.performedAt.$lte).toEqual(to);
      expect(query.performedAt.$gte).toBeUndefined();
    });

    it('should not include performedAt in query when neither from nor to is provided', async () => {
      mockFindChain([]);

      await service.findAll({});

      const query = historyModel.find.mock.calls[0][0];
      expect(query.performedAt).toBeUndefined();
    });

    it('should apply custom limit when provided', async () => {
      const chain = mockFindChain([]);

      await service.findAll({ limit: 10 });

      expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it('should combine multiple filters', async () => {
      const from = new Date('2024-01-01');
      mockFindChain([mockHistoryEntry]);

      await service.findAll({
        entityType: HistoryEntityType.INVOICE,
        action: HistoryAction.STATUS_CHANGED,
        from,
        limit: 50,
      });

      const query = historyModel.find.mock.calls[0][0];
      expect(query.entityType).toBe(HistoryEntityType.INVOICE);
      expect(query.action).toBe(HistoryAction.STATUS_CHANGED);
      expect(query.performedAt.$gte).toEqual(from);
    });

    it('should return empty array when no entries match', async () => {
      mockFindChain([]);

      const result = await service.findAll({ entityType: HistoryEntityType.INVOICE });

      expect(result).toEqual([]);
    });
  });
});