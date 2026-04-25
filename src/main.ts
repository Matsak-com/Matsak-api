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
  fs.mkdirSync(join(__dirname, '..', 'uploads', 'prescriptions'), {
    recursive: true,
  });

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Enable CORS first — before any other middleware so preflight OPTIONS
  // requests are handled before guards, filters, and body parsers run.
  app.enableCors(corsConfig);

  app.setGlobalPrefix('api');

  // 50 MB limit to accommodate base64-encoded product images.
  // Adjust via BODY_SIZE_LIMIT env var (e.g. "100mb") if needed.
  const bodySizeLimit = process.env.BODY_SIZE_LIMIT ?? '50mb';

  app.use(
    express.json({
      limit: bodySizeLimit,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: true, limit: bodySizeLimit }));

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  // Serve email logo and other static assets (used as URL in email templates)
  app.use('/assets', express.static(join(__dirname, 'assets')));

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
