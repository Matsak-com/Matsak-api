import * as fs from 'fs';
import * as path from 'path';

export function encodeImageToBase64(filePath: string): {
  mimeType: string;
  data: string;
} {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase().replace('.', ''); // 'png'
  const supportedTypes = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp', 'svg'];
  if (!supportedTypes.includes(ext)) {
    throw new Error(`Unsupported image type: .${ext}`);
  }

  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const fileData = fs.readFileSync(filePath);
  const base64 = fileData.toString('base64');

  return {
    mimeType,
    data: base64,
  };
}
