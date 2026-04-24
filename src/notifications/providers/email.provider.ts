import { Injectable, Logger } from '@nestjs/common';
import { EmailOptions } from '../interfaces/email-options.interface';
import { IEmailProvider } from '../interfaces/notification-provider.interface';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '../i18n.service';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailProvider implements IEmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private hbs: typeof handlebars;
  private readonly templateDir: string;
  private readonly LOGO_CID = 'matsak-logo';

  // ─── Cache logo : undefined = pas encore tenté, null = introuvable ───────
  private logoAttachmentCache:
    | {
        filename: string;
        content: Buffer;
        cid: string;
        contentType: string;
        contentDisposition: string;
      }
    | null
    | undefined = undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {
    this.hbs = handlebars.create();
    this.templateDir = this.findTemplateDirectory();
    this.configureHandlebars();
    this.logger.log(`Template directory: ${this.templateDir}`);
  }

  /**
   * Build a fresh nodemailer transporter.
   * pool:false — creates a new TCP connection per message, preventing stale
   * socket ECONNRESET that occurs when the SMTP server drops idle connections.
   */
  private createTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPass =
      this.configService.get<string>('MAIL_PASS') ||
      this.configService.get<string>('MAIL_PASSWORD');
    const secure = this.configService.get('MAIL_SECURE', 'false') === 'true';
    const rejectUnauthorized =
      this.configService.get('MAIL_TLS_REJECT_UNAUTHORIZED', 'true') !==
      'false';

    const options: SMTPTransport.Options = {
      host: this.configService.get('MAIL_HOST', 'localhost'),
      port: parseInt(this.configService.get('MAIL_PORT', '1025'), 10),
      secure,
      // Prevent opportunistic STARTTLS — plain-SMTP servers (e.g. MailHog)
      // return 500 on STARTTLS which nodemailer then handles as ECONNRESET.
      ignoreTLS: !secure,
      // Only pass TLS socket options when the connection is actually TLS.
      ...(secure ? { tls: { rejectUnauthorized } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
      ...(mailUser && mailPass
        ? { auth: { user: mailUser, pass: mailPass } }
        : {}),
    };

    return nodemailer.createTransport(options);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    await this.doSend(options, false);
  }

  private async doSend(options: EmailOptions, isRetry: boolean): Promise<void> {
    // Fresh transporter per attempt — prevents stale-socket issues in Docker
    // and ensures MailHog (or any plain-SMTP server) gets a clean connection.
    const transporter = this.createTransporter();
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

      const fullContext = await this.prepareFullContext(
        template || 'generic',
        subject,
        context || {},
        locale,
      );

      const mailOptions: any = {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        from: this.configService.get('MAIL_FROM', 'noreply@matsak-mg.com'),
        // Logo is now served via HTTP URL — no inline CID attachment needed.
        // CID attachments force a multipart/related wrapper that MailHog and
        // some clients can't render, showing raw MIME source instead of HTML.
        attachments: attachments || [],
      };

      if (template) {
        const emailHtml = await this.compileEmail(template, fullContext);
        mailOptions.html = emailHtml;
        await transporter.sendMail(mailOptions);
        this.logger.log(`Email '${template}' sent to ${to}`);
      } else if (html) {
        mailOptions.html = html;
        await transporter.sendMail(mailOptions);
      } else if (text) {
        mailOptions.text = text;
        await transporter.sendMail(mailOptions);
      }
    } catch (error) {
      // Retry once on transient SMTP connection errors.
      // nodemailer wraps raw TCP errors (ECONNRESET etc.) as code='ESOCKET'.
      // "Connection closed unexpectedly" has no code — match by message.
      const isTransient =
        !isRetry &&
        (error.code === 'ESOCKET' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.message === 'Connection closed unexpectedly' ||
          (typeof error.message === 'string' &&
            error.message.includes('ECONNRESET')));
      if (isTransient) {
        this.logger.warn(
          `SMTP connection lost (${error.code ?? error.message}), retrying…`,
        );
        return this.doSend(options, true);
      }
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Always release the TCP connection back to MailHog / SMTP server.
      transporter.close();
    }
  }

  /**
   * Construire l'attachment du logo en CID
   * Lazy memoization — I/O disque une seule fois, warn loggé une seule fois
   */
  private buildLogoAttachment(): {
    filename: string;
    content: Buffer;
    cid: string;
    contentType: string;
    contentDisposition: string;
  } | null {
    // Déjà tenté → retourner le cache directement sans I/O
    if (this.logoAttachmentCache !== undefined) {
      return this.logoAttachmentCache;
    }

    const possibleLogoPaths = [
      path.join(process.cwd(), 'src/assets/images/matsak-logo.png'),
      path.join(process.cwd(), 'dist/assets/images/matsak-logo.png'),
      path.join(__dirname, '../../../assets/images/matsak-logo.png'),
      path.join(__dirname, '../../assets/images/matsak-logo.png'),
    ];

    for (const logoPath of possibleLogoPaths) {
      if (fs.existsSync(logoPath)) {
        this.logger.debug(`Logo found at: ${logoPath}`);
        this.logoAttachmentCache = {
          filename: 'matsak-logo.png',
          content: fs.readFileSync(logoPath),
          cid: this.LOGO_CID,
          contentType: 'image/png',
          contentDisposition: 'inline',
        };
        return this.logoAttachmentCache;
      }
    }

    // Warn une seule fois — les appels suivants retournent null directement
    this.logger.warn('Logo file not found, emails will be sent without logo');
    this.logoAttachmentCache = null;
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
    const apiUrl = this.configService.get(
      'APP_API_URL',
      'http://localhost:8080',
    );
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
      // Logo served via static HTTP — avoids multipart/related MIME structure
      // that prevents MailHog and some clients from rendering the HTML body.
      logoUrl: `${apiUrl}/assets/images/matsak-logo.png`,
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
      // Convert kebab-case template name to camelCase for i18n key lookup
      // e.g. "reset-password" → "resetPassword"
      const i18nKey = templateName.replace(/-([a-z])/g, (_, c) =>
        c.toUpperCase(),
      );
      const translations = this.i18nService.getTranslations(
        `email.${i18nKey}`,
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
        // Caller-supplied 't' keys take priority over auto-loaded ones,
        // ensuring pre-resolved translations are never overwritten.
        t: { ...translations, ...(baseContext.t || {}) },
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
