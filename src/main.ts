import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { corsConfig } from './configs/cors/cors.config';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: corsConfig });
  app.setGlobalPrefix('api');

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
