import { SessionMiddleware } from './session.middleware';

describe('SessionMiddleware', () => {
  let middleware: SessionMiddleware;

  const mockNext = jest.fn();

  // ── Helpers ────────────────────────────────────────────────────────────
  const mockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockRequest = (cookies: Record<string, string> = {}): any => ({
    cookies: { ...cookies },
  });

  beforeEach(() => {
    middleware = new SessionMiddleware();
    mockNext.mockClear();
  });

  // ── Aucun consentement (undefined) ─────────────────────────────────────
  describe('when cookieConsent is absent', () => {
    it('should call next() without setting or clearing any cookie', () => {
      const req = mockRequest({});
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.clearCookie).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  // ── Consentement refusé ────────────────────────────────────────────────
  describe('when cookieConsent is rejected', () => {
    it('should call next() without setting a session cookie', () => {
      const req = mockRequest({ cookieConsent: 'rejected' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should clear an existing sessionId cookie', () => {
      const req = mockRequest({
        cookieConsent: 'rejected',
        sessionId: 'existing-session',
      });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.clearCookie).toHaveBeenCalledWith('sessionId', { path: '/' });
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not call clearCookie when no sessionId exists', () => {
      const req = mockRequest({ cookieConsent: 'rejected' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.clearCookie).not.toHaveBeenCalled();
    });
  });

  // ── Consentement accepté ───────────────────────────────────────────────
  describe('when cookieConsent is accepted', () => {
    it('should create a sessionId cookie when none exists', () => {
      const req = mockRequest({ cookieConsent: 'accepted' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.cookie).toHaveBeenCalledWith(
        'sessionId',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 7,
        }),
      );
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should set a valid UUID as sessionId', () => {
      const req = mockRequest({ cookieConsent: 'accepted' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      const [, sessionId] = res.cookie.mock.calls[0];
      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should inject the sessionId into req.cookies', () => {
      const req = mockRequest({ cookieConsent: 'accepted' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(req.cookies.sessionId).toBeDefined();
      expect(typeof req.cookies.sessionId).toBe('string');
    });

    it('should not create a new sessionId when one already exists', () => {
      const req = mockRequest({
        cookieConsent: 'accepted',
        sessionId: 'existing-uuid',
      });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should set secure=true in production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = mockRequest({ cookieConsent: 'accepted' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.cookie).toHaveBeenCalledWith(
        'sessionId',
        expect.any(String),
        expect.objectContaining({ secure: true }),
      );

      process.env.NODE_ENV = original;
    });

    it('should set secure=false outside production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const req = mockRequest({ cookieConsent: 'accepted' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      expect(res.cookie).toHaveBeenCalledWith(
        'sessionId',
        expect.any(String),
        expect.objectContaining({ secure: false }),
      );

      process.env.NODE_ENV = original;
    });
  });

  // ── Valeur inconnue ────────────────────────────────────────────────────
  describe('when cookieConsent has an unknown value', () => {
    it('should call next() without setting or clearing any cookie', () => {
      const req = mockRequest({ cookieConsent: 'unknown' });
      const res = mockResponse();

      middleware.use(req, res, mockNext);

      // Aucune des branches (rejected / accepted) ne correspond
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.clearCookie).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});
