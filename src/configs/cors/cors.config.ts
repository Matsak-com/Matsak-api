import {
  CorsOptions,
  CustomOrigin,
} from '@nestjs/common/interfaces/external/cors-options.interface';

type CorsOptionsWithOriginFn = Omit<CorsOptions, 'origin'> & {
  origin: CustomOrigin;
};

// Hardcoded development origins — always allowed regardless of env config.
const DEFAULT_ALLOWED_ORIGINS: ReadonlyArray<string> = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'https://localhost:8080',
  'http://localhost:8081',
  'https://localhost:8081',
  'http://localhost:5173',
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

/**
 * Build the allowed-origins Set lazily so that CORS_ORIGIN is read after
 * dotenv / ConfigModule has had a chance to populate process.env.
 * The Set is cached after the first request.
 */
let _allowedOrigins: Set<string> | null = null;

function getAllowedOrigins(): Set<string> {
  if (_allowedOrigins) return _allowedOrigins;

  const envOrigins: string[] =
    process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim() !== ''
      ? process.env.CORS_ORIGIN.split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

  _allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);
  return _allowedOrigins;
}

export const corsConfig: CorsOptionsWithOriginFn = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();

    // No origin header = same-origin or server-to-server request — allow it.
    if (!origin || allowed.has(origin)) {
      callback(null, true);
      return;
    }

    // Reject cleanly without throwing — throwing here propagates to the
    // global exception filter which sends an error response WITHOUT CORS
    // headers, causing the browser to show a misleading CORS error.
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-matsak-web',
    'x-user-id',
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export default corsConfig;
