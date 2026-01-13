/**
 * Note: This test file uses CommonJS require() instead of ES6 imports.
 * This is intentional because the cors.config module reads environment variables
 * at module load time. To test different environment variable scenarios, we need
 * to reset the module cache using jest.resetModules() and re-require the module
 * with different process.env values. ES6 imports are hoisted and cannot be
 * dynamically re-imported in this way.
 */
describe('CORS Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear the module cache to allow re-importing with different env variables
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment variable parsing', () => {
    it('should parse comma-separated origins from CORS_ORIGIN environment variable', () => {
      process.env.CORS_ORIGIN = 'https://example.com,https://app.example.com';
      
      const { corsConfig } = require('./cors.config');
      
      const testOrigins = ['https://example.com', 'https://app.example.com'];
      
      testOrigins.forEach((origin) => {
        corsConfig.origin(origin, (err: Error | null, allowed: boolean) => {
          expect(err).toBeNull();
          expect(allowed).toBe(true);
        });
      });
    });

    it('should trim whitespace from environment variable origins', () => {
      process.env.CORS_ORIGIN = ' https://example.com , https://app.example.com ';
      
      const { corsConfig } = require('./cors.config');
      
      const testOrigins = ['https://example.com', 'https://app.example.com'];
      
      testOrigins.forEach((origin) => {
        corsConfig.origin(origin, (err: Error | null, allowed: boolean) => {
          expect(err).toBeNull();
          expect(allowed).toBe(true);
        });
      });
    });

    it('should filter out empty strings from environment variable origins', () => {
      process.env.CORS_ORIGIN = 'https://example.com,,https://app.example.com,';
      
      const { corsConfig } = require('./cors.config');
      
      // Should not throw errors and should work correctly
      corsConfig.origin('https://example.com', (err: Error | null, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });

    it('should handle missing CORS_ORIGIN environment variable', () => {
      delete process.env.CORS_ORIGIN;
      
      const { corsConfig } = require('./cors.config');
      
      // Should still allow default origins
      corsConfig.origin('http://localhost:3000', (err: Error | null, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });
  });

  describe('Combining environment origins with default origins', () => {
    it('should allow both default and environment-provided origins', () => {
      process.env.CORS_ORIGIN = 'https://production.example.com';
      
      const { corsConfig } = require('./cors.config');
      
      // Test default origin
      corsConfig.origin('http://localhost:3000', (err: Error | null, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
      
      // Test environment origin
      corsConfig.origin('https://production.example.com', (err: Error | null, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });

    it('should not duplicate origins if environment variable contains default origins', () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000,https://example.com';
      
      const { corsConfig } = require('./cors.config');
      
      // Should work without issues
      corsConfig.origin('http://localhost:3000', (err: Error | null, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });
  });

  describe('Origin validation behavior', () => {
    beforeEach(() => {
      delete process.env.CORS_ORIGIN;
    });

    it('should allow requests from allowed origins', () => {
      const { corsConfig } = require('./cors.config');
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'https://localhost:8080',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
      ];
      
      allowedOrigins.forEach((origin) => {
        corsConfig.origin(origin, (err: Error | null, allowed: boolean) => {
          expect(err).toBeNull();
          expect(allowed).toBe(true);
        });
      });
    });

    it('should reject requests from disallowed origins', () => {
      const { corsConfig } = require('./cors.config');
      
      const disallowedOrigins = [
        'https://evil.com',
        'http://malicious-site.com',
        'http://localhost:9999',
      ];
      
      disallowedOrigins.forEach((origin) => {
        corsConfig.origin(origin, (err: Error | null, allowed: boolean) => {
          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toBe('Not allowed by CORS');
        });
      });
    });

    it('should allow requests without an origin (e.g., Postman, mobile apps)', () => {
      const { corsConfig } = require('./cors.config');
      
      corsConfig.origin(undefined, (err: Error | null, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
    });

    it('should reject origin with similar but not exact match', () => {
      const { corsConfig } = require('./cors.config');
      
      // These should be rejected as they don't exactly match allowed origins
      const similarButNotExact = [
        'http://localhost:3000/', // Has trailing slash
        'http://localhost:3000/api', // Has path
        'http://localhost:3002', // Different port
      ];
      
      similarButNotExact.forEach((origin) => {
        corsConfig.origin(origin, (err: Error | null, allowed: boolean) => {
          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toBe('Not allowed by CORS');
        });
      });
    });
  });

  describe('CORS configuration options', () => {
    it('should have correct methods configured', () => {
      const { corsConfig } = require('./cors.config');
      
      expect(corsConfig.methods).toEqual([
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
      ]);
    });

    it('should have credentials enabled', () => {
      const { corsConfig } = require('./cors.config');
      
      expect(corsConfig.credentials).toBe(true);
    });

    it('should have correct allowed headers', () => {
      const { corsConfig } = require('./cors.config');
      
      expect(corsConfig.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
        'x-matsak-web',
        'x-user-id',
      ]);
    });

    it('should have correct options success status', () => {
      const { corsConfig } = require('./cors.config');
      
      expect(corsConfig.optionsSuccessStatus).toBe(204);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple environment origins correctly', () => {
      process.env.CORS_ORIGIN = 'https://app1.example.com,https://app2.example.com,https://app3.example.com';
      
      const { corsConfig } = require('./cors.config');
      
      // All environment origins should be allowed
      const envOrigins = ['https://app1.example.com', 'https://app2.example.com', 'https://app3.example.com'];
      envOrigins.forEach((origin) => {
        corsConfig.origin(origin, (err: Error | null, allowed: boolean) => {
          expect(err).toBeNull();
          expect(allowed).toBe(true);
        });
      });
      
      // Default origins should still be allowed
      corsConfig.origin('http://localhost:3000', (err: Error | null, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
      });
      
      // Non-allowed origins should be rejected
      corsConfig.origin('https://evil.com', (err: Error | null, allowed: boolean) => {
        expect(err).toBeInstanceOf(Error);
      });
    });
  });
});
