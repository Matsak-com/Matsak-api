import {
  Model,
  FilterQuery,
  UpdateQuery,
  PopulateOptions,
  ProjectionType,
  QueryOptions,
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

  withNotDeleted(filter?: FilterQuery<T>) {
    return {
      ...(filter ?? {}),
      deleted_at: null,
    };
  }


  async create(doc: Partial<T>): Promise<T> {
    const created = new this.model(doc);
    return created.save();
  }

  async findAll(
    filter: FilterQuery<T> = {},
    options: QueryOptionsExtended<T> = {},
  ): Promise<(T & { _id: any })[]> {
    const query = this.model.find(
      this.withNotDeleted(filter),
      options.projection,
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  async findOne(
    filter: FilterQuery<T>,
    options: QueryOptionsExtended<T> = {},
  ): Promise<T | null> {
    const query = this.model.findOne(
      this.withNotDeleted(filter),
      options.projection,
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  async findById(
    id: string,
    options: QueryOptionsExtended<T> = {},
  ): Promise<T | null> {
    const query = this.model.findOne(
      this.withNotDeleted({ _id: id } as FilterQuery<T>),
      options.projection,
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  async update(
    id: string,
    update: UpdateQuery<T>,
    options: QueryOptionsExtended<T> = {},
  ): Promise<T | null> {
    const query = this.model.findOneAndUpdate(
      this.withNotDeleted({ _id: id } as FilterQuery<T>),
      update,
      { new: true, runValidators: true },
    );
    this.applyQueryOptions(query, options);
    return query.exec();
  }

  async delete(
    id: string,
    options: QueryOptionsExtended<T> = {},
  ): Promise<T | null> {
    const update: UpdateQuery<T> = { deleted_at: new Date() } as any;
    const query = this.model.findOneAndUpdate(
      this.withNotDeleted({ _id: id } as FilterQuery<T>),
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
}
