import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailOptions } from '../interfaces/email-options.interface';
import { IEmailProvider } from '../interfaces/notification-provider.interface';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '../i18n.service';

@Injectable()
export class EmailProvider implements IEmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private plainTransporter: nodemailer.Transporter;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {
    // Create a separate transporter for non-template emails
    this.plainTransporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST', 'mailhog'),
      port: parseInt(this.configService.get('MAIL_PORT', '1025')),
      secure: false,
      ignoreTLS: true,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const {
        to,
        subject,
        template,
        context,
        html,
        text,
        attachments,
        locale = 'en',
      } = options;

      this.logger.debug(
        `Email options: template=${template}, hasContext=${!!context}, hasHtml=${!!html}, hasText=${!!text}, locale=${locale}`,
      );

      // Validate and normalize locale
      const emailLocale = this.i18nService.isSupportedLocale(locale)
        ? locale
        : 'en';

      const mailOptions: any = {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        from: this.configService.get('MAIL_FROM', 'noreply@matsak.com'),
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      // Use template if provided, otherwise use plain transport
      if (template && context) {
        // Enrich context with translations
        const enrichedContext = this.enrichContextWithTranslations(
          template,
          context,
          emailLocale,
        );

        // Use Handlebars template via mailerService
        this.logger.debug(
          `Sending email with template: ${template}, locale: ${emailLocale}`,
        );
        mailOptions.template = template;
        mailOptions.context = enrichedContext;
        await this.mailerService.sendMail(mailOptions);
      } else {
        // For plain text or HTML emails, use plain nodemailer transport
        // to bypass the template engine completely
        this.logger.debug(
          'Sending email without template (plain text or HTML)',
        );
        if (html) {
          mailOptions.html = html;
        } else if (text) {
          mailOptions.text = text;
        }

        await this.plainTransporter.sendMail(mailOptions);
      }

      this.logger.log(`Email sent successfully to ${mailOptions.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Enrich template context with translations
   */
  private enrichContextWithTranslations(
    template: string,
    context: any,
    locale: string,
  ): any {
    const namespace = `email.${template}`;

    // Get all translations for this template
    const translations = this.i18nService.getTranslations(
      namespace,
      locale as any,
      context,
    );

    // Add common translations
    const commonTranslations = this.i18nService.getTranslations(
      'email.common',
      locale as any,
      { year: new Date().getFullYear() },
    );

    // Merge context with translations
    return {
      ...context,
      t: translations,
      common: commonTranslations,
      locale,
    };
  }
}
