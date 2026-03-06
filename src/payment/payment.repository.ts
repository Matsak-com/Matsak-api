import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PopulateOptions, UpdateQuery } from 'mongoose';
import { Payment, PaymentDocument } from './payment.schema';

interface FindByIdParams {
  id: string;
  options?: { populate?: PopulateOptions | PopulateOptions[] };
}

interface FindOneParams {
  filter: FilterQuery<Payment>;
  options?: { populate?: PopulateOptions | PopulateOptions[] };
}

interface FindAllParams {
  filter?: FilterQuery<Payment>;
  options?: { populate?: PopulateOptions | PopulateOptions[] };
}

interface CreateParams {
  doc: Partial<Payment>;
}

interface UpdateParams {
  id: string;
  update: UpdateQuery<Payment>;
}

interface DeleteParams {
  id: string;
}

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(params: CreateParams): Promise<PaymentDocument> {
    return this.paymentModel.create(params.doc);
  }

  async findById(params: FindByIdParams): Promise<PaymentDocument | null> {
    const query = this.paymentModel.findById(params.id);
    if (params.options?.populate) {
      query.populate(params.options.populate);
    }
    return query.exec();
  }

  async findOne(params: FindOneParams): Promise<PaymentDocument | null> {
    const query = this.paymentModel.findOne(params.filter);
    if (params.options?.populate) {
      query.populate(params.options.populate);
    }
    return query.exec();
  }

  async findAll(params: FindAllParams = {}): Promise<PaymentDocument[]> {
    const query = this.paymentModel.find(params.filter || {});
    if (params.options?.populate) {
      query.populate(params.options.populate);
    }
    return query.exec();
  }

  async update(params: UpdateParams): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findByIdAndUpdate(params.id, params.update, { new: true })
      .exec();
  }

  async delete(params: DeleteParams): Promise<void> {
    await this.paymentModel.findByIdAndDelete(params.id).exec();
  }
}
