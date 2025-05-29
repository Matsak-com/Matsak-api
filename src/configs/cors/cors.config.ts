import { CorsOptions } from 'cors';

export const corsConfig: CorsOptions = {
  origin: '*', //['http://localhost:3000'], // Update with your allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

export default corsConfig;
