import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import 'dotenv/config';
import { fileSchema } from '../users/utils/file-utils';
import { z } from 'zod';
import placeholder from './image-placeholder.json';
import { InternalServerErrorException } from '@nestjs/common';
import { ERRORS } from 'src/common/errors';

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET = process.env.AWS_SECRET;
const AWS_REGION = process.env.AWS_REGION;

export class AwsS3Service {
  private readonly client: S3Client;
  constructor() {
    if (!AWS_ACCESS_KEY) {
      throw new InternalServerErrorException(ERRORS.AWS_INVALID_ACCESS_KEY);
    }

    if (!AWS_SECRET) {
      throw new InternalServerErrorException(ERRORS.AWS_INVALID_SECRET);
    }
    if (!AWS_REGION) {
      throw new InternalServerErrorException(ERRORS.AWS_INVALID_REGION);
    }
    const client = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET,
      },
      region: AWS_REGION,
    });
    this.client = client;
  }

  async uploadFile({
    file,
    fileKey,
  }: {
    file: z.infer<typeof fileSchema>;
    fileKey: string;
  }) {
    let extension: string | undefined;
    const lastDotIndex = file.originalname.lastIndexOf('.');
    if (lastDotIndex > 0 && lastDotIndex < file.originalname.length - 1) {
      extension = file.originalname.substring(lastDotIndex + 1);
    }
    if (extension && !fileKey.endsWith(`.${extension}`)) {
      fileKey = `${fileKey}.${extension}`;
    }
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      ContentType: file.mimetype,
      Body: file.buffer,
      CacheControl: 'max-age=31536000',
    });

    const result = await this.client.send(putObjectCommand);
    if (result.$metadata.httpStatusCode !== 200) {
      console.error(result);
    }
    return { fileKey };
  }

  async deleteFile({ fileKey }: { fileKey: string }) {
    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    });

    const result = await this.client.send(deleteObjectCommand);
    if (result.$metadata.httpStatusCode !== 200) {
    }
  }

  async getFileUrl({ fileKey }: { fileKey: string }) {
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    });

    const result = await getSignedUrl(this.client, getObjectCommand);
    return result || placeholder.base64Image;
  }
}
