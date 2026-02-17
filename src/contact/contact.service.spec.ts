import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';
import { getQueueToken } from '@nestjs/bull';
import { ContactDto } from './dto/contact.dto';
import { ConfigService } from '@nestjs/config';

describe('ContactService', () => {
  let service: ContactService;
  let mockQueue: { add: jest.Mock };
  let mockConfigService: { get: jest.Mock };

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
    mockQueue = {
      add: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('1x0000000000000000000000000000000AA'),
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
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TESTS queueContactEmail
  describe('queueContactEmail', () => {
    it('devrait ajouter un job à la queue avec les bonnes données', async () => {
      const mockTimestamp = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      await service.queueContactEmail(mockContactDto, '192.168.1.100');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-contact-email',
        {
          dto: mockContactDto,
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

    it('devrait inclure tous les champs du DTO dans le job', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      await service.queueContactEmail(mockContactDto, '192.168.1.100');
      const jobData = mockQueue.add.mock.calls[0][1];

      expect(jobData.dto).toEqual(mockContactDto);
      expect(jobData.dto.firstName).toBe('Jean');
      expect(jobData.dto.lastName).toBe('Dupont');
      expect(jobData.dto.email).toBe('jean.dupont@example.com');
      expect(jobData.dto.phone).toBe('034 12 345 67');
      expect(jobData.dto.subject).toBe("Demande d'information");
      expect(jobData.dto.message).toBe(
        "Bonjour, je souhaiterais avoir plus d'informations sur vos services.",
      );
      expect(jobData.dto.turnstileToken).toBe('valid-token'); // ← ajouté
    });

    it('devrait fonctionner avec un DTO sans téléphone', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      const dtoSansPhone = { ...mockContactDto, phone: undefined };
      await service.queueContactEmail(dtoSansPhone, '192.168.1.100');

      const jobData = mockQueue.add.mock.calls[0][1];
      expect(jobData.dto.phone).toBeUndefined();
    });

    it('devrait fonctionner avec un honeypot rempli', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      const dtoAvecHoneypot = { ...mockContactDto, honeypot: 'Je suis un bot' };
      await service.queueContactEmail(dtoAvecHoneypot, '192.168.1.100');

      const jobData = mockQueue.add.mock.calls[0][1];
      expect(jobData.dto.honeypot).toBe('Je suis un bot');
    });
  });

  // TESTS verifyTurnstile
  describe('verifyTurnstile', () => {
    it('devrait retourner true si Cloudflare répond success: true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      const result = await service.verifyTurnstile('valid-token');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('valid-token'),
        }),
      );
    });

    it('devrait retourner false si Cloudflare répond success: false', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: false }),
      } as any);

      const result = await service.verifyTurnstile('invalid-token');

      expect(result).toBe(false);
    });

    it('devrait utiliser la secretKey depuis ConfigService', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      await service.verifyTurnstile('any-token');

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.secret).toBe('1x0000000000000000000000000000000AA');
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'TURNSTILE_SECRET_KEY',
      );
    });

    it('devrait rejeter si fetch échoue', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.verifyTurnstile('any-token')).rejects.toThrow(
        'Network error',
      );
    });
  });

  // TESTS intégration queue
  describe('intégration queue', () => {
    it('devrait appeler queue.add exactement une fois par appel', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      await service.queueContactEmail(mockContactDto, '192.168.1.100');
      await service.queueContactEmail(mockContactDto, '192.168.1.101');

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it("devrait rejeter l'erreur si la queue échoue", async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      mockQueue.add.mockRejectedValueOnce(new Error('Erreur Redis temporaire'));

      await expect(
        service.queueContactEmail(mockContactDto, '192.168.1.100'),
      ).rejects.toThrow('Erreur Redis temporaire');

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });
  });
});
