import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { getQueueToken } from '@nestjs/bull';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailProvider: EmailProvider;
  let smsProvider: SmsProvider;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EmailProvider,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: SmsProvider,
          useValue: {
            sendSms: jest.fn(),
          },
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailProvider = module.get<EmailProvider>(EmailProvider);
    smsProvider = module.get<SmsProvider>(SmsProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should call emailProvider.sendEmail with correct options', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test content',
      };

      await service.sendEmail(emailOptions);

      expect(emailProvider.sendEmail).toHaveBeenCalledWith(emailOptions);
    });
  });

  describe('sendSms', () => {
    it('should call smsProvider.sendSms with correct options', async () => {
      const smsOptions = {
        to: '+1234567890',
        message: 'Test SMS',
      };

      await service.sendSms(smsOptions);

      expect(smsProvider.sendSms).toHaveBeenCalledWith(smsOptions);
    });
  });

  describe('scheduleEmail', () => {
    it('should send email immediately if sendAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000);
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test content',
        sendAt: pastDate,
      };

      await service.scheduleEmail(emailOptions);

      expect(emailProvider.sendEmail).toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should queue email if sendAt is in the future', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test content',
        sendAt: futureDate,
      };

      await service.scheduleEmail(emailOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.any(Object),
        expect.objectContaining({ delay: expect.any(Number) }),
      );
      expect(emailProvider.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('scheduleSms', () => {
    it('should send SMS immediately if sendAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000);
      const smsOptions = {
        to: '+1234567890',
        message: 'Test SMS',
        sendAt: pastDate,
      };

      await service.scheduleSms(smsOptions);

      expect(smsProvider.sendSms).toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should queue SMS if sendAt is in the future', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const smsOptions = {
        to: '+1234567890',
        message: 'Test SMS',
        sendAt: futureDate,
      };

      await service.scheduleSms(smsOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.any(Object),
        expect.objectContaining({ delay: expect.any(Number) }),
      );
      expect(smsProvider.sendSms).not.toHaveBeenCalled();
    });
  });
});
