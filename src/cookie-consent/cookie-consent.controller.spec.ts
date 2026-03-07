import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { CookieConsentController } from './cookie-consent.controller';

describe('CookieConsentController', () => {
  let controller: CookieConsentController;

  // ── Helpers mock req/res ───────────────────────────────────────────────
  const mockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockRequest = (cookies: Record<string, string> = {}) => ({
    cookies,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CookieConsentController],
    }).compile();

    controller = module.get<CookieConsentController>(CookieConsentController);
  });

  // ── POST /accept ────────────────────────────────────────────────────────
  describe('acceptCookies', () => {
    it('should set cookieConsent=accepted with correct options', () => {
      const res = mockResponse();

      controller.acceptCookies(res);

      expect(res.cookie).toHaveBeenCalledWith(
        'cookieConsent',
        'accepted',
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 365,
        }),
      );
    });

    it('should return 200 with success payload', () => {
      const res = mockResponse();

      controller.acceptCookies(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          consent: 'accepted',
        }),
      );
    });

    it('should set secure=true in production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const res = mockResponse();

      controller.acceptCookies(res);

      expect(res.cookie).toHaveBeenCalledWith(
        'cookieConsent',
        'accepted',
        expect.objectContaining({ secure: true }),
      );

      process.env.NODE_ENV = original;
    });

    it('should set secure=false outside production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const res = mockResponse();

      controller.acceptCookies(res);

      expect(res.cookie).toHaveBeenCalledWith(
        'cookieConsent',
        'accepted',
        expect.objectContaining({ secure: false }),
      );

      process.env.NODE_ENV = original;
    });
  });

  // ── POST /reject ────────────────────────────────────────────────────────
  describe('rejectCookies', () => {
    it('should clear sessionId cookie', () => {
      const res = mockResponse();

      controller.rejectCookies(res);

      expect(res.clearCookie).toHaveBeenCalledWith('sessionId', { path: '/' });
    });

    it('should set cookieConsent=rejected', () => {
      const res = mockResponse();

      controller.rejectCookies(res);

      expect(res.cookie).toHaveBeenCalledWith(
        'cookieConsent',
        'rejected',
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 365,
        }),
      );
    });

    it('should return 200 with success payload', () => {
      const res = mockResponse();

      controller.rejectCookies(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          consent: 'rejected',
        }),
      );
    });
  });

  // ── GET /status ─────────────────────────────────────────────────────────
  describe('getConsentStatus', () => {
    it('should return hasConsent=true when cookie is accepted', () => {
      const req = mockRequest({ cookieConsent: 'accepted' });
      const res = mockResponse();

      controller.getConsentStatus(req as any, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({
        hasConsent: true,
        consent: 'accepted',
      });
    });

    it('should return hasConsent=false when cookie is rejected', () => {
      const req = mockRequest({ cookieConsent: 'rejected' });
      const res = mockResponse();

      controller.getConsentStatus(req as any, res);

      expect(res.json).toHaveBeenCalledWith({
        hasConsent: false,
        consent: 'rejected',
      });
    });

    it('should return hasConsent=false and consent=null when no cookie', () => {
      const req = mockRequest({});
      const res = mockResponse();

      controller.getConsentStatus(req as any, res);

      expect(res.json).toHaveBeenCalledWith({
        hasConsent: false,
        consent: null,
      });
    });

    it('should return hasConsent=false for unknown consent value', () => {
      const req = mockRequest({ cookieConsent: 'unknown_value' });
      const res = mockResponse();

      controller.getConsentStatus(req as any, res);

      expect(res.json).toHaveBeenCalledWith({
        hasConsent: false,
        consent: 'unknown_value',
      });
    });
  });
});
