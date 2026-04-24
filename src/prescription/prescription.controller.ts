import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response, Request } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import contentDisposition from 'content-disposition';
import { Types } from 'mongoose';
import { PrescriptionService } from './prescription.service';
import { PrescriptionStatus } from './prescription.schema';
import { ERRORS } from 'src/common/errors';

const ALLOWED_PRESCRIPTION_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

// ✅ Répertoire de base sécurisé (résolu en absolu au démarrage)
const UPLOADS_BASE_DIR = path.resolve('./uploads/prescriptions');

@Controller('prescription')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // ✅ Callback qui crée le dossier s'il n'existe pas
        destination: (req, file, callback) => {
          fs.mkdirSync(UPLOADS_BASE_DIR, { recursive: true });
          callback(null, UPLOADS_BASE_DIR);
        },
        filename: (req, file, callback) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeName = `${uuidv4()}${ext}`;
          callback(null, safeName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_PRESCRIPTION_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              ERRORS.ONLY_PDF_AND_IMAGE_FILES_ARE_ALLOWED,
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
    @Req() req?: Request,
  ) {
    if (!file) {
      throw new BadRequestException(ERRORS.FILE_IS_REQUIRED);
    }

    // ✅ Validation cartId : doit être un ObjectId Mongoose valide si fourni
    if (cartId && !Types.ObjectId.isValid(cartId)) {
      throw new BadRequestException(ERRORS.INVALID_CART_ID);
    }

    const relativePath = `uploads/prescriptions/${file.filename}`;
    const baseUrl =
      process.env.APP_URL ?? `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/${relativePath}`;

    return this.prescriptionService.create({
      fileName: file.originalname,
      storagePath: relativePath,
      fileUrl,
      mimeType: file.mimetype,
      size: file.size,
      cartId: cartId ? new Types.ObjectId(cartId) : null,
      status: PrescriptionStatus.PENDING,
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

    // ✅ Sécurité path traversal : on s'assure que le chemin reste dans uploads/prescriptions
    const absolutePath = path.resolve(prescription.storagePath);
    if (!absolutePath.startsWith(UPLOADS_BASE_DIR)) {
      throw new BadRequestException(ERRORS.INVALID_FILE_PATH);
    }

    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException(ERRORS.FILE_NOT_FOUND);
    }

    // ✅ content-disposition package pour encoder correctement le nom de fichier
    res.setHeader(
      'Content-Disposition',
      contentDisposition(prescription.fileName, { type: 'inline' }),
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
