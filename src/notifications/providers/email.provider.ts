import { Injectable, Logger } from '@nestjs/common';
import { EmailOptions } from '../interfaces/email-options.interface';
import { IEmailProvider } from '../interfaces/notification-provider.interface';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '../i18n.service';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailProvider implements IEmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: nodemailer.Transporter;
  private hbs: typeof handlebars;
  private readonly templateDir: string;
  private readonly LOGO_CID = 'matsak-logo';

  constructor(
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST', 'localhost'),
      port: parseInt(this.configService.get('MAIL_PORT', '1025')),
      secure: false,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    });

    this.hbs = handlebars.create();
    this.templateDir = this.findTemplateDirectory();
    this.configureHandlebars();
    this.logger.log(`Template directory: ${this.templateDir}`);
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
        locale = 'fr',
      } = options;

      this.logger.debug(
        `Sending email to ${to}, template: ${template}, locale: ${locale}`,
      );

      // Préparer le contexte
      const fullContext = await this.prepareFullContext(
        template || 'generic',
        subject,
        context || {},
        locale,
      );

      // Attachment logo CID
      const logoAttachment = this.buildLogoAttachment();

      const mailOptions: any = {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        from: this.configService.get('MAIL_FROM', 'noreply@matsak-mg.com'),
        attachments: [
          ...(logoAttachment ? [logoAttachment] : []),
          ...(attachments || []),
        ],
      };

      if (template) {
        const emailHtml = await this.compileEmail(template, fullContext);
        mailOptions.html = emailHtml;

        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email '${template}' sent to ${to}`);
      } else if (html) {
        mailOptions.html = html;
        await this.transporter.sendMail(mailOptions);
      } else if (text) {
        mailOptions.text = text;
        await this.transporter.sendMail(mailOptions);
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Construire l'attachment du logo en CID
   */
private buildLogoAttachment(): {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
  contentDisposition: string;
} | null {
  const possibleLogoPaths = [
    path.join(process.cwd(), 'src/assets/images/matsak-logo.png'),
    path.join(process.cwd(), 'dist/assets/images/matsak-logo.png'),
    path.join(__dirname, '../../../assets/images/matsak-logo.png'),
    path.join(__dirname, '../../assets/images/matsak-logo.png'),
  ];

  for (const logoPath of possibleLogoPaths) {
    if (fs.existsSync(logoPath)) {
      this.logger.debug(`Logo found at: ${logoPath}`);
      return {
        filename: 'matsak-logo.png',
        content: fs.readFileSync(logoPath), // ← Buffer direct, plus fiable que path
        cid: this.LOGO_CID,
        contentType: 'image/png',
        contentDisposition: 'inline',
      };
    }
  }

  this.logger.warn('Logo file not found, email will be sent without logo');
  return null;
}
  /**
   * Compiler un email avec layout et partials
   */
  private async compileEmail(
    templateName: string,
    context: any,
  ): Promise<string> {
    try {
      const templatePath = path.join(
        this.templateDir,
        'emails',
        `${templateName}.hbs`,
      );
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }

      const templateContent = fs.readFileSync(templatePath, 'utf8');
      this.logger.debug(`Loaded template: ${templateName}`);

      const layoutPath = path.join(this.templateDir, 'layouts', 'default.hbs');
      if (!fs.existsSync(layoutPath)) {
        throw new Error(`Layout not found: ${layoutPath}`);
      }

      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      this.logger.debug(`Loaded layout: default`);

      const combinedContent = layoutContent.replace(
        '{{{body}}}',
        templateContent,
      );

      const compiled = this.hbs.compile(combinedContent);
      const result = compiled(context);

      this.logger.debug(
        `Email compiled successfully, length: ${result.length} chars`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to compile email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configurer Handlebars avec les partials
   */
  private configureHandlebars(): void {
    try {
      this.registerPartial('header', 'partials/header.hbs');
      this.registerPartial('footer', 'partials/footer.hbs');
      this.logger.debug('Handlebars configured with partials');
    } catch (error) {
      this.logger.error(`Failed to configure Handlebars: ${error.message}`);
    }
  }

  /**
   * Enregistrer un partial
   */
  private registerPartial(name: string, relativePath: string): void {
    try {
      const partialPath = path.join(this.templateDir, relativePath);

      if (!fs.existsSync(partialPath)) {
        this.logger.warn(`Partial not found: ${partialPath}`);
        return;
      }

      const partialSource = fs.readFileSync(partialPath, 'utf8');
      this.hbs.registerPartial(name, partialSource);
      this.logger.debug(`Registered partial: ${name}`);
    } catch (error) {
      this.logger.warn(`Could not register partial ${name}: ${error.message}`);
    }
  }

  /**
   * Préparer le contexte pour les templates
   */
  private async prepareFullContext(
    templateName: string,
    subject: string,
    context: any,
    locale: string,
  ): Promise<any> {
    const platform = {
      name: this.configService.get('APP_NAME', 'Matsak'),
      url: this.configService.get('FRONTEND_URL', 'http://localhost:3000'),
      supportEmail: this.configService.get(
        'SUPPORT_EMAIL',
        'support@matsak-mg.com',
      ),
      contactEmail: this.configService.get(
        'CONTACT_EMAIL',
        'contact@matsak-mg.com',
      ),
      logoCid: this.LOGO_CID, // ← plus d'URL, on passe le CID au template
    };

    const urls = {
      loginUrl: `${platform.url}/auth/login`,
      dashboardUrl: `${platform.url}/dashboard`,
      helpCenterUrl: `${platform.url}/help`,
      contactUrl: `${platform.url}/contact`,
      privacyPolicyUrl: `${platform.url}/privacy`,
      termsUrl: `${platform.url}/terms`,
    };

    const baseContext = {
      subject,
      locale,
      user: context.user || {},
      platform,
      ...urls,
      year: new Date().getFullYear(),
      currentDate: new Date().toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      ...context,
    };

    try {
      const translations = this.i18nService.getTranslations(
        `email.${templateName}`,
        locale as any,
        baseContext,
      );

      const commonTranslations = this.i18nService.getTranslations(
        'email.common',
        locale as any,
        {
          year: baseContext.year,
          platformName: platform.name,
        },
      );

      return {
        ...baseContext,
        t: translations,
        common: commonTranslations,
      };
    } catch (i18nError) {
      this.logger.warn(
        `Could not load i18n translations: ${i18nError.message}`,
      );
      return baseContext;
    }
  }

  /**
   * Trouver le répertoire des templates
   */
  private findTemplateDirectory(): string {
    const cwd = process.cwd();
    const possiblePaths = [
      path.join(cwd, 'src/notifications/templates'),
      path.join(cwd, 'notifications/templates'),
      path.join(__dirname, '../../../notifications/templates'),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        this.logger.log(`Found templates at: ${possiblePath}`);
        return possiblePath;
      }
    }

    const defaultPath = possiblePaths[0];
    this.logger.warn(`Template directory not found, using: ${defaultPath}`);
    return defaultPath;
  }
}