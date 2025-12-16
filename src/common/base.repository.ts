import {
  Model,
  FilterQuery,
  UpdateQuery,
  PopulateOptions,
  ProjectionType,
  Types,
} from 'mongoose';

type QueryOptionsExtended<T> = {
  populate?: PopulateOptions | (string | PopulateOptions)[];
  projection?: ProjectionType<T>;
  sort?: any;
  limit?: number;
  skip?: number;
  lean?: boolean;
};

export class BaseRepository<T extends { deleted_at?: Date }> {
  constructor(protected readonly model: Model<T>) {}

  /**
   * Ensures the id is converted to Types.ObjectId
   * @param id - String or ObjectId
   * @returns ObjectId
   */
  private ensureObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (typeof id === 'string') {
      return new Types.ObjectId(id);
    }
    return id;
  }

  withNotDeleted(filter?: FilterQuery<T>) {
    // Use $exists:false so we match documents where `deleted_at` is not set
    // (some repositories use `{ deleted_at: { $exists: false } }`). This
    // ensures consistency across the codebase and avoids missing results
    // when the field is absent.
    return {
      ...(filter ?? {}),
      deleted_at: { $exists: false },
    } as FilterQuery<T>;
  }

  async create({
    doc,
    options = { save: true },
  }: {
    doc: Partial<T>;
    options?: { save?: boolean };
  }): Promise<T> {
    const created = new this.model(doc);
    if (options.save === false) {
      return created;
    }
    return created.save();
  }

  async findAll({
    filter = {},
    options = {},
  }: {
    filter?: FilterQuery<T>;
    options?: QueryOptionsExtended<T>;
  } = {}): Promise<(T & { _id: any })[]> {
    const query = this.model.find(
      this.withNotDeleted(filter),
      options.projection,
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  async findOne({
    filter,
    options = {},
  }: {
    filter: FilterQuery<T>;
    options?: QueryOptionsExtended<T>;
  }): Promise<T | null> {
    const query = this.model.findOne(
      this.withNotDeleted(filter),
      options.projection,
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  async findById({
    id,
    options = {},
  }: {
    id: string | Types.ObjectId;
    options?: QueryOptionsExtended<T>;
  }): Promise<T | null> {
    const objectId = this.ensureObjectId(id);
    const query = this.model.findOne(
      this.withNotDeleted({ _id: objectId } as FilterQuery<T>),
      options.projection,
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  async update({
    id,
    update,
    options = {},
  }: {
    id: string | Types.ObjectId;
    update: UpdateQuery<T>;
    options?: QueryOptionsExtended<T>;
  }): Promise<T | null> {
    const objectId = this.ensureObjectId(id);
    const query = this.model.findOneAndUpdate(
      this.withNotDeleted({ _id: objectId } as FilterQuery<T>),
      update,
      { new: true, runValidators: true },
    );
    this.applyUpdateQueryOptions(query, options);
    return query.exec();
  }

  async delete({
    id,
    options = {},
  }: {
    id: string | Types.ObjectId;
    options?: QueryOptionsExtended<T>;
  }): Promise<T | null> {
    const objectId = this.ensureObjectId(id);
    const update: UpdateQuery<T> = { deleted_at: new Date() } as any;
    const query = this.model.findOneAndUpdate(
      this.withNotDeleted({ _id: objectId } as FilterQuery<T>),
      update,
      { new: true, runValidators: true },
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  private applyQueryOptions(query: any, options: QueryOptionsExtended<T>) {
    if (options.populate) query.populate(options.populate);
    if (options.sort) query.sort(options.sort);
    if (options.limit !== undefined) query.limit(options.limit);
    if (options.skip !== undefined) query.skip(options.skip);
    if (options.lean) query.lean();
  }

  private applyUpdateQueryOptions(
    query: any,
    options: QueryOptionsExtended<T>,
  ) {
    // For update operations, we don't apply projection as it can interfere with the update
    // We also skip sort, limit, skip as they don't make sense for findOneAndUpdate
    if (options.populate) query.populate(options.populate);
    if (options.lean) query.lean();
  }

  /**
   * Execute aggregation pipeline
   * @param pipeline - Aggregation pipeline array
   * @returns Promise with aggregation results
   */
  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }
}
