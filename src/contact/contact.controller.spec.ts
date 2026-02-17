import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ContactController', () => {
  let controller: ContactController;
  let contactService: ContactService;

  const mockContactService = {
    queueContactEmail: jest.fn(),
    verifyTurnstile: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        {
          provide: ContactService,
          useValue: mockContactService,
        },
      ],
    }).compile();

    controller = module.get<ContactController>(ContactController);
    contactService = module.get<ContactService>(ContactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitContactForm', () => {
    const validBody = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      subject: "Demande d'information",
      message:
        "Bonjour, je souhaiterais avoir plus d'informations sur vos services.",
      turnstileToken: 'valid-token',
    };
    const ip = '192.168.1.100';

    it('devrait retourner 200 et appeler le service avec des données valides', async () => {
      const result = await controller.submitContactForm(validBody, ip);

      expect(result).toEqual({ message: 'Thank you for your message!' });
      expect(contactService.verifyTurnstile).toHaveBeenCalledWith(
        'valid-token',
      );
      expect(contactService.queueContactEmail).toHaveBeenCalledTimes(1);

      const dtoPassed = (contactService.queueContactEmail as jest.Mock).mock
        .calls[0][0];
      expect(dtoPassed.firstName).toBe('Jean');
      expect(dtoPassed.email).toBe('jean.dupont@example.com');
      expect(dtoPassed.honeypot).toBeUndefined();
    });

    it('devrait retourner 200 SANS appeler le service si honeypot rempli', async () => {
      const bodyWithHoneypot = {
        ...validBody,
        honeypot: 'Je suis un bot',
      };

      const result = await controller.submitContactForm(bodyWithHoneypot, ip);

      expect(result).toEqual({ message: 'Thank you for your message!' });
      expect(contactService.verifyTurnstile).not.toHaveBeenCalled();
      expect(contactService.queueContactEmail).not.toHaveBeenCalled();
    });

    // ← nouveau test
    it('devrait lever ForbiddenException si le token Turnstile est invalide', async () => {
      mockContactService.verifyTurnstile.mockResolvedValueOnce(false);

      await expect(controller.submitContactForm(validBody, ip)).rejects.toThrow(
        ForbiddenException,
      );

      expect(contactService.queueContactEmail).not.toHaveBeenCalled();
    });

    // ← nouveau test
    it('devrait rejeter avec BadRequestException si turnstileToken manquant', async () => {
      const bodyWithoutToken = {
        ...validBody,
        turnstileToken: '',
      };

      await expect(
        controller.submitContactForm(bodyWithoutToken, ip),
      ).rejects.toThrow(BadRequestException);

      expect(contactService.verifyTurnstile).not.toHaveBeenCalled();
      expect(contactService.queueContactEmail).not.toHaveBeenCalled();
    });

    it('devrait rejeter avec BadRequestException si email invalide', async () => {
      const invalidBody = {
        ...validBody,
        email: 'email-invalide',
      };

      await expect(
        controller.submitContactForm(invalidBody, ip),
      ).rejects.toThrow(BadRequestException);

      expect(contactService.queueContactEmail).not.toHaveBeenCalled();
    });

    it('devrait rejeter avec BadRequestException si message trop court', async () => {
      const invalidBody = {
        ...validBody,
        message: 'Court',
      };

      await expect(
        controller.submitContactForm(invalidBody, ip),
      ).rejects.toThrow(BadRequestException);

      expect(contactService.queueContactEmail).not.toHaveBeenCalled();
    });

    it('devrait rejeter avec BadRequestException si firstName manquant', async () => {
      const invalidBody = {
        ...validBody,
        firstName: '',
      };

      await expect(
        controller.submitContactForm(invalidBody, ip),
      ).rejects.toThrow(BadRequestException);

      expect(contactService.queueContactEmail).not.toHaveBeenCalled();
    });

    it("devrait normaliser l'email en minuscules", async () => {
      const bodyWithUppercaseEmail = {
        ...validBody,
        email: 'JEAN.DUPONT@EXAMPLE.COM',
      };

      await controller.submitContactForm(bodyWithUppercaseEmail, ip);

      const dtoPassed = (contactService.queueContactEmail as jest.Mock).mock
        .calls[0][0];
      expect(dtoPassed.email).toBe('jean.dupont@example.com');
    });

    it('devrait nettoyer les espaces dans le téléphone', async () => {
      const bodyWithPhone = {
        ...validBody,
        phone: '  034 12 345 67  ',
      };

      await controller.submitContactForm(bodyWithPhone, ip);

      const dtoPassed = (contactService.queueContactEmail as jest.Mock).mock
        .calls[0][0];
      expect(dtoPassed.phone).toBe('034 12 345 67');
    });
  });
});
