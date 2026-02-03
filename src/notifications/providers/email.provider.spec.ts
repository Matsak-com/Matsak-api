import { Test, TestingModule } from '@nestjs/testing';
import { EmailProvider } from './email.provider';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '../i18n.service';

// Créez un mock complet
class MockTransporter {
  sendMail = jest.fn().mockResolvedValue({});
}

describe('EmailProvider', () => {
  let provider: EmailProvider;
  let mockTransporter: MockTransporter;

  beforeEach(async () => {
    mockTransporter = new MockTransporter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProvider,
        {
          provide: MailerService,
          useValue: { sendMail: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                MAIL_HOST: 'localhost',
                MAIL_PORT: '1025',
                MAIL_FROM: 'test@example.com',
                FRONTEND_URL: 'http://localhost:3000',
                APP_NAME: 'Test App',
                SUPPORT_EMAIL: 'support@example.com',
              };
              return config[key];
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
    })
    .overrideProvider(EmailProvider)
    .useFactory({
      factory: (
        mailerService: MailerService,
        configService: ConfigService,
        i18nService: I18nService,
      ) => {
        const provider = new EmailProvider(mailerService, configService, i18nService);
        
        (provider as any).plainTransporter = mockTransporter;
        
        (provider as any).compileWithLayoutAndTranslations = jest.fn()
          .mockResolvedValue('<html>Mocked HTML</html>');
        
        (provider as any).configureHandlebars = jest.fn();
        (provider as any).registerPartials = jest.fn();
        (provider as any).findTemplateDirectory = jest.fn().mockReturnValue('/tmp');
        
        return provider;
      },
      inject: [MailerService, ConfigService, I18nService],
    })
    .compile();

    provider = module.get<EmailProvider>(EmailProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email with template', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        template: 'welcome',
        context: { name: 'John' },
      };

      await provider.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test',
          html: '<html>Mocked HTML</html>',
          from: 'test@example.com',
        })
      );
    });

    it('should send email with html', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<h1>Hello</h1>',
      };

      await provider.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>Hello</h1>',
        })
      );
    });

    it('should send email with text', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        text: 'Hello world',
      };

      await provider.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello world',
        })
      );
    });
  });
});