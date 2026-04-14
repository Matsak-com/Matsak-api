import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionRepository } from './prescription.repository';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionStatus } from './prescription.schema';
import * as fs from 'fs';
import * as path from 'path';
import { Types } from 'mongoose';

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
  ) {}

  async create(createPrescriptionDto: CreatePrescriptionDto) {
    return this.prescriptionRepository.create({
      doc: {
        ...createPrescriptionDto,
        status: createPrescriptionDto.status ?? PrescriptionStatus.PENDING,
      },
    });
  }

  async findAll() {
    return this.prescriptionRepository.findAll();
  }

  async findOne(id: string) {
    const prescription = await this.prescriptionRepository.findById({ id });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    return prescription;
  }

  async update(id: string, updatePrescriptionDto: UpdatePrescriptionDto) {
    if (
      updatePrescriptionDto.status === PrescriptionStatus.VALIDATED &&
      !updatePrescriptionDto.invoiceId
    ) {
      throw new BadRequestException(
        'invoiceId is required when prescription is validated',
      );
    }

    const update = { ...updatePrescriptionDto } as any;

    if (updatePrescriptionDto.status === PrescriptionStatus.VALIDATED) {
      update.cartId = null;
      update.validatedAt = new Date();
    }

    const prescription = await this.prescriptionRepository.update({
      id,
      update,
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  async validate(id: string, invoiceId: string) {
    if (!invoiceId) {
      throw new BadRequestException(
        'invoiceId is required to validate prescription',
      );
    }

    return this.update(id, {
      status: PrescriptionStatus.VALIDATED,
      invoiceId: new Types.ObjectId(invoiceId),
      cartId: null,
    });
  }

  /**
   * Supprime le fichier physique du disque ET applique un soft delete en DB
   * (le document reste en base avec `deleted_at` défini via BaseRepository)
   */
  async delete(id: string) {
    const prescription = await this.findOne(id);

    // Supprime le fichier physique du disque
    const absolutePath = path.resolve(prescription.storagePath);
    try {
      await fs.promises.access(absolutePath);
      await fs.promises.unlink(absolutePath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        // Continue with the DB delete even if file deletion fails
      }
    }

    // Soft delete en DB : définit deleted_at via BaseRepository
    return this.prescriptionRepository.delete({ id });
  }
}