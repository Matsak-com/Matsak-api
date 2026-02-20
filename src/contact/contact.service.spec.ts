import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';
import { getQueueToken } from '@nestjs/bull';
import { ContactDto } from './dto/contact.dto';
import { ConfigService } from '@nestjs/config';

describe('ContactService', () => {
  let service: ContactService;
  let mockQueue: { add: jest.Mock };
  let originalFetch: typeof global.fetch;

  const mockContactDto: ContactDto = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '034 12 345 67',
    subject: "Demande d'information",
    message:
      "Bonjour, je souhaiterais avoir plus d'informations sur vos services.",
    honeypot: '',
    turnstileToken: 'valid-token',
  };

  beforeEach(async () => {
    originalFetch = global.fetch;

    mockQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: getQueueToken('contact-emails'),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TURNSTILE_SECRET_KEY') {
                return 'test-secret-key';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('queueContactEmail', () => {
    it('devrait ajouter un job à la queue avec les bonnes données', async () => {
      const mockTimestamp = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      await service.queueContactEmail(mockContactDto, '192.168.1.100');

      const expectedPayload = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '034 12 345 67',
        subject: "Demande d'information",
        message:
          "Bonjour, je souhaiterais avoir plus d'informations sur vos services.",
      };

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-contact-email',
        {
          dto: expectedPayload,
          ip: '192.168.1.100',
          timestamp: mockTimestamp,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    });

    it('devrait utiliser un timestamp actuel si non mocké', async () => {
      const before = Date.now();
      await service.queueContactEmail(mockContactDto, '192.168.1.100');
      const after = Date.now();

      const callArgs = mockQueue.add.mock.calls[0][1];

      expect(callArgs.timestamp).toBeGreaterThanOrEqual(before);
      expect(callArgs.timestamp).toBeLessThanOrEqual(after);
      expect(typeof callArgs.timestamp).toBe('number');
    });

    it('devrait fonctionner avec un DTO sans téléphone', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      const dtoSansPhone = { ...mockContactDto, phone: undefined };
      await service.queueContactEmail(dtoSansPhone, '192.168.1.100');

      const jobData = mockQueue.add.mock.calls[0][1];
      expect(jobData.dto.phone).toBeUndefined();
    });
  });

  describe('intégration queue', () => {
    it('devrait appeler queue.add exactement une fois par appel', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      await service.queueContactEmail(mockContactDto, '192.168.1.100');
      await service.queueContactEmail(mockContactDto, '192.168.1.101');

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it("devrait rejeter l'erreur si la queue échoue", async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      const errorMessage = 'Erreur Redis temporaire';
      mockQueue.add.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        service.queueContactEmail(mockContactDto, '192.168.1.100'),
      ).rejects.toThrow(errorMessage);

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyTurnstile', () => {
    it('devrait retourner true si Cloudflare répond success: true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      const result = await service.verifyTurnstile('valid-token');
      expect(result).toBe(true);
    });

    it('devrait retourner false si Cloudflare répond success: false', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest
          .fn()
          .mockResolvedValue({ success: false, error: 'invalid token' }),
      } as any);

      const result = await service.verifyTurnstile('invalid-token');
      expect(result).toBe(false);
    });

    it('devrait retourner false si fetch échoue', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.verifyTurnstile('any-token');
      expect(result).toBe(false);

      consoleErrorSpy.mockRestore(); // Restaure console.error
    });

    // Vérification précise du format Cloudflare
    it('devrait appeler Cloudflare avec le bon endpoint et secret', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      await service.verifyTurnstile('test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      // Vérification du body query string
      const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
      expect(body).toContain('secret=test-secret-key');
      expect(body).toContain('response=test-token');
    });
  });
});
