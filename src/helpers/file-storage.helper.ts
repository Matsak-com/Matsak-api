import * as fs from 'fs';
import * as path from 'path';
import { InternalServerErrorException } from '@nestjs/common';

export interface Base64ImageResult {
  base64: string; // Full data URI: data:image/png;base64,iVBORw0KG...
  mimeType: string; // e.g., image/png
  localPath: string; // Local file path where the image is saved
}

/**
 * Save uploaded file locally and convert to base64 data URI
 * @param file - Multer uploaded file
 * @param saveDir - Directory to save the file (relative to project root)
 * @param filename - Optional custom filename (without extension)
 * @returns Base64 data URI and local file path
 */
export async function saveFileAsBase64(
  file: Express.Multer.File,
  saveDir: string,
  filename?: string,
): Promise<Base64ImageResult> {
  try {
    // Ensure the save directory exists
    const fullSaveDir = path.join(process.cwd(), saveDir);
    if (!fs.existsSync(fullSaveDir)) {
      fs.mkdirSync(fullSaveDir, { recursive: true });
    }

    // Determine the file extension
    const ext = path.extname(file.originalname) || '.png';
    const finalFilename = filename
      ? `${filename}${ext}`
      : `${Date.now()}-${file.originalname}`;
    const localPath = path.join(fullSaveDir, finalFilename);

    // Save file to local filesystem
    fs.writeFileSync(localPath, file.buffer);

    // Convert to base64
    const base64Data = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/png';
    const base64DataUri = `data:${mimeType};base64,${base64Data}`;

    return {
      base64: base64DataUri,
      mimeType,
      localPath: path.join(saveDir, finalFilename).replace(/\\/g, '/'), // Normalize path
    };
  } catch (error) {
    throw new InternalServerErrorException(
      `Failed to save image: ${error.message}`,
    );
  }
}

/**
 * Convert existing file buffer to base64 data URI
 * @param file - Multer uploaded file
 * @returns Base64 data URI
 */
export function fileToBase64DataUri(file: Express.Multer.File): string {
  const base64Data = file.buffer.toString('base64');
  const mimeType = file.mimetype || 'image/png';
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Delete a locally saved file
 * @param filePath - Path to the file to delete
 */
export function deleteLocalFile(filePath: string): void {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error.message);
  }
}

/**
 * Read a local file and convert to base64 data URI
 * @param filePath - Path to the file to read
 * @returns Base64 data URI
 */
export function readFileAsBase64(filePath: string): string {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    const fileData = fs.readFileSync(fullPath);
    const base64Data = fileData.toString('base64');
    
    // Detect mime type from extension
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    
    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    throw new InternalServerErrorException(
      `Failed to read image: ${error.message}`,
    );
  }
}
