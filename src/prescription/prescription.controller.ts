import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { PrescriptionService } from './prescription.service';
import { PrescriptionStatus } from './prescription.schema';

const ALLOWED_PRESCRIPTION_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Controller('prescription')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/prescriptions',
        filename: (req, file, callback) => {
          const safeName = `${Date.now()}-${file.originalname}`;
          callback(null, safeName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_PRESCRIPTION_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Seuls les fichiers PDF ou images sont autorisés',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('cartId') cartId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Le fichier prescription est requis');
    }

    const relativePath = path.join('uploads', 'prescriptions', file.filename);
    const fileUrl = `${process.env.APP_URL}/${relativePath.replace(/\\/g, '/')}`;

    return this.prescriptionService.create({
      fileName: file.originalname,
      storagePath: relativePath,
      fileUrl,
      mimeType: file.mimetype,
      size: file.size,
      cartId,
      status: PrescriptionStatus.AWAIT,
    });
  }

  @Get()
  async findAll() {
    return this.prescriptionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prescriptionService.findOne(id);
  }

  @Get(':id/file')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const prescription = await this.prescriptionService.findOne(id);

    const absolutePath = path.resolve(prescription.storagePath);

    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException('Fichier introuvable sur le serveur');
    }

    res.setHeader(
      'Content-Disposition',
      `inline; filename="${prescription.fileName}"`,
    );
    res.setHeader('Content-Type', prescription.mimeType);

    const stream = fs.createReadStream(absolutePath);

    stream.on('error', (error: NodeJS.ErrnoException) => {
      if (res.headersSent) {
        if (!res.writableEnded) {
          res.end();
        }
        return;
      }

      if (error.code === 'ENOENT') {
        res.status(404).json({ message: 'Fichier introuvable sur le serveur' });
        return;
      }

      if (error.code === 'EACCES' || error.code === 'EPERM') {
        res.status(403).json({ message: 'Accès au fichier refusé' });
        return;
      }

      res.status(500).json({ message: 'Erreur lors de la lecture du fichier' });
    });
    stream.pipe(res);
  }

  @Patch(':id/validate')
  async validate(
    @Param('id') id: string,
    @Body('invoiceId') invoiceId: string,
  ) {
    return this.prescriptionService.validate(id, invoiceId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prescriptionService.delete(id);
  }
}
