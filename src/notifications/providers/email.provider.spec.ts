import { Test, TestingModule } from '@nestjs/testing';
import { EmailProvider } from './email.provider';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '../i18n.service';

describe('EmailProvider', () => {
  let provider: EmailProvider;
  let mailerService: MailerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProvider,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config = {
                MAIL_HOST: 'localhost',
                MAIL_PORT: '1025',
                MAIL_FROM: 'test@example.com',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: I18nService,
          useValue: {
            isSupportedLocale: jest.fn(() => true),
            getTranslations: jest.fn(() => ({})),
          },
        },
      ],
    }).compile();

    provider = module.get<EmailProvider>(EmailProvider);
    mailerService = module.get<MailerService>(MailerService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email with template and context', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        context: { name: 'John Doe' },
      };

      await provider.sendEmail(emailOptions);

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          template: 'welcome',
          from: 'test@example.com',
          context: expect.objectContaining({
            name: 'John Doe',
          }),
        }),
      );
    });

    it('should send email with HTML content', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      // Mock the plainTransporter.sendMail
      const mockSendMail = jest.fn().mockResolvedValue({});
      (provider as any).plainTransporter = { sendMail: mockSendMail };

      await provider.sendEmail(emailOptions);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
          from: 'test@example.com',
        }),
      );
    });

    it('should send email with text content', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test text content',
      };

      // Mock the plainTransporter.sendMail
      const mockSendMail = jest.fn().mockResolvedValue({});
      (provider as any).plainTransporter = { sendMail: mockSendMail };

      await provider.sendEmail(emailOptions);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test text content',
          from: 'test@example.com',
        }),
      );
    });

    it('should handle multiple recipients', async () => {
      const emailOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        text: 'Test content',
      };

      // Mock the plainTransporter.sendMail
      const mockSendMail = jest.fn().mockResolvedValue({});
      (provider as any).plainTransporter = { sendMail: mockSendMail };

      await provider.sendEmail(emailOptions);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test1@example.com, test2@example.com',
          subject: 'Test Subject',
          text: 'Test content',
          from: 'test@example.com',
        }),
      );
    });

    it('should handle attachments', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        attachments: [
          {
            filename: 'test.pdf',
            path: '/path/to/test.pdf',
          },
        ],
      };

      // Mock the plainTransporter.sendMail
      const mockSendMail = jest.fn().mockResolvedValue({});
      (provider as any).plainTransporter = { sendMail: mockSendMail };

      await provider.sendEmail(emailOptions);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test content',
          from: 'test@example.com',
          attachments: [
            {
              filename: 'test.pdf',
              path: '/path/to/test.pdf',
            },
          ],
        }),
      );
    });
  });
});
