import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionService } from './prescription.service';
import { PrescriptionRepository } from './prescription.repository';
import { PrescriptionStatus } from './prescription.schema';
import { Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// ── Mock fs ──────────────────────────────────────────────────────────────────
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    unlink: jest.fn(),
  },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const mockPrescription = {
  _id: 'prescription-id-1',
  fileName: 'ordo.pdf',
  storagePath: 'uploads/prescriptions/123-ordo.pdf',
  fileUrl: 'http://localhost:8080/uploads/prescriptions/123-ordo.pdf',
  mimeType: 'application/pdf',
  size: 12345,
  cartId: new Types.ObjectId(),
  status: PrescriptionStatus.PENDING,
};

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────

describe('PrescriptionService', () => {
  let service: PrescriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionService,
        { provide: PrescriptionRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PrescriptionService>(PrescriptionService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait créer une prescription avec le status PENDING par défaut', async () => {
      mockRepository.create.mockResolvedValue(mockPrescription);

      const dto = {
        fileName: 'ordo.pdf',
        storagePath: 'uploads/prescriptions/123-ordo.pdf',
        fileUrl: 'http://localhost:8080/uploads/prescriptions/123-ordo.pdf',
        mimeType: 'application/pdf',
        size: 12345,
        cartId: new Types.ObjectId(),
      };

      const result = await service.create(dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith({
        doc: { ...dto, status: PrescriptionStatus.PENDING },
      });
      expect(result).toEqual(mockPrescription);
    });

    it('devrait conserver le status fourni dans le DTO', async () => {
      mockRepository.create.mockResolvedValue(mockPrescription);

      const dto = {
        fileName: 'ordo.pdf',
        storagePath: 'uploads/prescriptions/123-ordo.pdf',
        fileUrl: 'http://localhost:8080/uploads/prescriptions/123-ordo.pdf',
        mimeType: 'application/pdf',
        size: 12345,
        status: PrescriptionStatus.VALIDATED,
      };

      await service.create(dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith({
        doc: expect.objectContaining({ status: PrescriptionStatus.VALIDATED }),
      });
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devrait retourner toutes les prescriptions', async () => {
      mockRepository.findAll.mockResolvedValue([mockPrescription]);

      const result = await service.findAll();

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockPrescription]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devrait retourner la prescription si elle existe', async () => {
      mockRepository.findById.mockResolvedValue(mockPrescription);

      const result = await service.findOne('prescription-id-1');

      expect(mockRepository.findById).toHaveBeenCalledWith({ id: 'prescription-id-1' });
      expect(result).toEqual(mockPrescription);
    });

    it('devrait lever NotFoundException si la prescription est introuvable', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('inexistant-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('devrait mettre à jour une prescription', async () => {
      const updated = { ...mockPrescription, status: PrescriptionStatus.VALIDATED };
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.update('prescription-id-1', {
        status: PrescriptionStatus.VALIDATED,
        invoiceId: new Types.ObjectId(),
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prescription-id-1' }),
      );
      expect(result.status).toBe(PrescriptionStatus.VALIDATED);
    });

    it('devrait lever BadRequestException si status VALIDATED sans invoiceId', async () => {
      await expect(
        service.update('prescription-id-1', { status: PrescriptionStatus.VALIDATED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait définir cartId à null et validatedAt lors de la validation', async () => {
      const updated = { ...mockPrescription, cartId: null, validatedAt: new Date() };
      mockRepository.update.mockResolvedValue(updated);

      await service.update('prescription-id-1', {
        status: PrescriptionStatus.VALIDATED,
        invoiceId: new Types.ObjectId(),
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            cartId: null,
            validatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('devrait lever NotFoundException si la prescription est introuvable', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update('inexistant-id', { status: PrescriptionStatus.PENDING }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── validate ──────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('devrait valider une prescription avec un invoiceId', async () => {
      const validated = { ...mockPrescription, status: PrescriptionStatus.VALIDATED };
      mockRepository.update.mockResolvedValue(validated);

      const invoiceId = new Types.ObjectId().toString();
      const result = await service.validate('prescription-id-1', invoiceId);

      expect(result.status).toBe(PrescriptionStatus.VALIDATED);
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            invoiceId: expect.any(Types.ObjectId),
            cartId: null,
          }),
        }),
      );
    });

    it('devrait lever BadRequestException si invoiceId est absent', async () => {
      await expect(service.validate('prescription-id-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('devrait supprimer le fichier physique et appliquer un soft delete en DB', async () => {
      mockRepository.findById.mockResolvedValue(mockPrescription);
      mockRepository.delete.mockResolvedValue({ deleted: true });
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.delete('prescription-id-1');

      const expectedPath = path.resolve(mockPrescription.storagePath);
      expect(fs.promises.access).toHaveBeenCalledWith(expectedPath);
      expect(fs.promises.unlink).toHaveBeenCalledWith(expectedPath);
      expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'prescription-id-1' });
    });

    it('ne devrait pas appeler unlink si le fichier est absent (ENOENT)', async () => {
      mockRepository.findById.mockResolvedValue(mockPrescription);
      mockRepository.delete.mockResolvedValue({ deleted: true });

      const enoentError = Object.assign(new Error('File not found'), { code: 'ENOENT' });
      (fs.promises.access as jest.Mock).mockRejectedValue(enoentError);

      await service.delete('prescription-id-1');

      expect(fs.promises.unlink).not.toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'prescription-id-1' });
    });

    it('devrait continuer le soft delete même si unlink échoue (erreur non-ENOENT)', async () => {
      mockRepository.findById.mockResolvedValue(mockPrescription);
      mockRepository.delete.mockResolvedValue({ deleted: true });

      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await service.delete('prescription-id-1');

      expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'prescription-id-1' });
    });

    it('devrait lever NotFoundException si la prescription est introuvable', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.delete('inexistant-id')).rejects.toThrow(NotFoundException);
      expect(fs.promises.unlink).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});