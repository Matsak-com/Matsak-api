import { Test, TestingModule } from '@nestjs/testing';
import { EmailProvider } from './email.provider';
import { MailerService } from '@nestjs-modules/mailer';

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

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        context: { name: 'John Doe' },
      });
    });

    it('should send email with HTML content', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await provider.sendEmail(emailOptions);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });
    });

    it('should send email with text content', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test text content',
      };

      await provider.sendEmail(emailOptions);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test text content',
      });
    });

    it('should handle multiple recipients', async () => {
      const emailOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        text: 'Test content',
      };

      await provider.sendEmail(emailOptions);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'test1@example.com, test2@example.com',
        subject: 'Test Subject',
        text: 'Test content',
      });
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

      await provider.sendEmail(emailOptions);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        attachments: [
          {
            filename: 'test.pdf',
            path: '/path/to/test.pdf',
          },
        ],
      });
    });
  });
});
