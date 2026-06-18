import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AwsS3Service } from '../aws/aws-s3.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface UploadResult {
  imageUrl: string;
  imageFileKey: string;
}

@Injectable()
export class AdImageService {
  /** Validate MIME type and size. Throws HttpException with the exact messages
   *  required by the spec before any I/O is attempted. */
  validate(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed');
    }
    if (file.size > MAX_SIZE) {
      throw new PayloadTooLargeException('File too large. Max 5 MB');
    }
  }

  /**
   * Upload the file to S3 (when AWS_S3_BUCKET is configured) or local disk.
   * The generated key is always `ads/{uuid}.{ext}` — the original filename is
   * never used for storage (sanitization requirement).
   */
  async upload(file: Express.Multer.File): Promise<UploadResult> {
    this.validate(file);

    const ext = MIME_TO_EXT[file.mimetype] ?? 'jpg';
    const uuid = randomUUID();
    const fileKey = `ads/${uuid}.${ext}`;

    if (process.env.AD_IMAGE_STORAGE === 's3') {
      return this.uploadToS3(file, fileKey, uuid, ext);
    }
    return this.uploadToLocalDisk(file, fileKey, uuid, ext);
  }

  /** Delete the previously stored file (best-effort, never throws). */
  async delete(imageFileKey: string | null | undefined): Promise<void> {
    if (!imageFileKey) return;

    if (process.env.AD_IMAGE_STORAGE === 's3') {
      try {
        const s3 = new AwsS3Service();
        await s3.deleteFile({ fileKey: imageFileKey });
      } catch (err) {
        console.error(
          `[AdImageService] S3 delete failed for ${imageFileKey}:`,
          err?.message,
        );
      }
    } else {
      try {
        const filePath = join(process.cwd(), 'uploads', imageFileKey);
        unlinkSync(filePath);
      } catch {
        // file may have already been removed — ignore
      }
    }
  }

  // ─── private helpers ────────────────────────────────────────────────────────

  private async uploadToS3(
    file: Express.Multer.File,
    fileKey: string,
    uuid: string,
    ext: string,
  ): Promise<UploadResult> {
    const s3 = new AwsS3Service();
    await s3.uploadFile({ file, fileKey });

    const cdnBase = process.env.CDN_BASE_URL?.replace(/\/$/, '');
    const imageUrl = cdnBase
      ? `${cdnBase}/ads/${uuid}.${ext}`
      : `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${fileKey}`;

    return { imageUrl, imageFileKey: fileKey };
  }

  private uploadToLocalDisk(
    file: Express.Multer.File,
    fileKey: string,
    uuid: string,
    ext: string,
  ): UploadResult {
    const dir = join(process.cwd(), 'uploads', 'ads');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${uuid}.${ext}`), file.buffer);

    const appUrl = (process.env.APP_URL ?? 'http://localhost:8080').replace(
      /\/$/,
      '',
    );
    return {
      imageUrl: `${appUrl}/uploads/ads/${uuid}.${ext}`,
      imageFileKey: fileKey,
    };
  }
}
