import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Prescription } from './prescription.schema';

@Injectable()
export class PrescriptionRepository extends BaseRepository<Prescription> {
  constructor(
    @InjectModel(Prescription.name)
    private readonly prescriptionModel: Model<Prescription>,
  ) {
    super(prescriptionModel);
  }
}
