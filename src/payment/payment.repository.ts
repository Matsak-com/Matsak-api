import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  FilterQuery,
  Model,
  PopulateOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { Payment, PaymentStatus } from './payment.schema';

interface FindByIdParams {
  id: string;
  options?: { populate?: PopulateOptions | PopulateOptions[] };
}

interface FindOneParams<T> {
  filter: FilterQuery<T>;
  options?: { populate?: PopulateOptions | PopulateOptions[] };
}
interface FindAllParams<T> {
  filter?: FilterQuery<T>;
  options?: { populate?: PopulateOptions | PopulateOptions[] };
}
interface CreateParams<T> {
  doc: Partial<T>;
}
interface UpdateParams<T> {
  id: string;
  update: UpdateQuery<T>;
}
interface DeleteParams {
  id: string;
}
abstract class BaseRepository<TDocument> {
  protected constructor(protected readonly model: Model<TDocument>) {}
  async create(params: CreateParams<TDocument>): Promise<TDocument> {
    return this.model.create(params.doc as any);
  }
  async findById(params: FindByIdParams): Promise<TDocument | null> {
    const query = this.model.findById(params.id);
    if (params.options?.populate) {
      query.populate(params.options.populate);
    }
    return query.exec();
  }
  async findOne(params: FindOneParams<TDocument>): Promise<TDocument | null> {
    const query = this.model.findOne(params.filter);
    if (params.options?.populate) {
      query.populate(params.options.populate);
    }
    return query.exec();
  }
  async findAll(params: FindAllParams<TDocument> = {}): Promise<TDocument[]> {
    const query = this.model.find(params.filter || {});
    if (params.options?.populate) {
      query.populate(params.options.populate);
    }
    return query.exec();
  }
  async update(params: UpdateParams<TDocument>): Promise<TDocument> {
    return this.model
      .findByIdAndUpdate(params.id, params.update, { new: true })
      .exec();
  }
  async delete(params: DeleteParams): Promise<void> {
    await this.model.findByIdAndDelete(params.id).exec();
  }
}

@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  constructor(
    @InjectModel(Payment.name)
    paymentModel: Model<Payment>,
  ) {
    super(paymentModel);
  }

  async transitionStatus({
    id,
    fromStatus,
    toStatus,
    update = {},
  }: {
    id: string;
    fromStatus: PaymentStatus;
    toStatus: PaymentStatus;
    update?: Record<string, any>;
  }): Promise<Payment | null> {
    return this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), status: fromStatus },
      { $set: { status: toStatus, ...update } },
      { new: true },
    );
  }
}
