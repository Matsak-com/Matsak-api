import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// Allow common Vue.js development ports and production configurations
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173', // Vite default port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:5173',
];

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is in allowed list or matches environment-specific origins
    if (
      allowedOrigins.includes(origin) ||
      process.env.CORS_ORIGIN?.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-matsak-web'],
  optionsSuccessStatus: 204,
};

export default corsConfig;
