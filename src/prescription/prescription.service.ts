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

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
  ) {}

  async create(createPrescriptionDto: CreatePrescriptionDto) {
    return this.prescriptionRepository.create({
      doc: {
        ...createPrescriptionDto,
        status: createPrescriptionDto.status ?? PrescriptionStatus.AWAIT,
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
      updatePrescriptionDto.status === PrescriptionStatus.VALIDATE &&
      !updatePrescriptionDto.invoiceId
    ) {
      throw new BadRequestException(
        'invoiceId is required when prescription is validated',
      );
    }

    const update = { ...updatePrescriptionDto } as any;

    if (updatePrescriptionDto.status === PrescriptionStatus.VALIDATE) {
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
      status: PrescriptionStatus.VALIDATE,
      invoiceId,
      cartId: null,
    });
  }

  // ✅ Supprime la prescription en DB + le fichier physique sur le disque
  async delete(id: string) {
    const prescription = await this.findOne(id);

    // Supprime le fichier physique
    const absolutePath = path.resolve(prescription.storagePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    return this.prescriptionRepository.delete({ id });
  }
}
