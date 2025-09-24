import * as fs from 'fs';
import * as path from 'path';
import { InternalServerErrorException } from '@nestjs/common';
import { ERRORS } from 'src/common/errors';

export function encodeImageToBase64(filePath: string): {
  mimeType: string;
  data: string;
} {
  if (!fs.existsSync(filePath)) {
    throw new InternalServerErrorException(ERRORS.FILE_NOT_FOUND);
  }

  const ext = path.extname(filePath).toLowerCase().replace('.', ''); // 'png'
  const supportedTypes = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp', 'svg'];
  if (!supportedTypes.includes(ext)) {
    throw new InternalServerErrorException(ERRORS.UNSUPPORTED_IMAGE_TYPE);
  }

  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const fileData = fs.readFileSync(filePath);
  const base64 = fileData.toString('base64');

  return {
    mimeType,
    data: base64,
  };
}
