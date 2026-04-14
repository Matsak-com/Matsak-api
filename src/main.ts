import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { corsConfig } from './configs/cors/cors.config';
import * as express from 'express';
import * as fs from 'fs';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // ✅ Fail fast si APP_URL manquant
  if (!process.env.APP_URL) {
    throw new Error('APP_URL environment variable is required');
  }

  // ✅ Crée le dossier au démarrage s'il n'existe pas
  fs.mkdirSync(join(__dirname, '..', 'uploads', 'prescriptions'), { recursive: true });

  const app = await NestFactory.create(AppModule, {
    cors: corsConfig,
    bodyParser: false,
  });

  app.setGlobalPrefix('api');

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
