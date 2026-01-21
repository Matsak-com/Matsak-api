import {
  CorsOptions,
  CustomOrigin,
} from '@nestjs/common/interfaces/external/cors-options.interface';

type CorsOptionsWithOriginFn = Omit<CorsOptions, 'origin'> & {
  origin: CustomOrigin;
};

// Allow common front-end development ports (HTTP and HTTPS)
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'https://localhost:8080',
  'http://localhost:8081',
  'https://localhost:8081',
  'http://localhost:5173', // Vite default port
  'https://localhost:5173',
  'http://localhost:4200',
  'https://localhost:4200',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'https://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'https://127.0.0.1:8081',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'http://127.0.0.1:4200',
  'https://127.0.0.1:4200',
  'https://firecamp.dev',
];

const rawCorsOrigin = process.env.CORS_ORIGIN;
const envAllowedOrigins =
  rawCorsOrigin && rawCorsOrigin.trim() !== ''
    ? rawCorsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...envAllowedOrigins,
]);

const isOriginAllowed = (origin?: string) => {
  if (!origin) return true;
  return allowedOrigins.has(origin);
};

export const corsConfig: CorsOptionsWithOriginFn = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-matsak-web',
    'x-user-id',
  ],
  optionsSuccessStatus: 204,
};

export default corsConfig;
