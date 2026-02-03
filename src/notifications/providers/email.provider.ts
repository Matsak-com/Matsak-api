// email.provider.ts - Version corrigée
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailOptions } from '../interfaces/email-options.interface';
import { IEmailProvider } from '../interfaces/notification-provider.interface';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '../i18n.service';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailProvider implements IEmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private plainTransporter: nodemailer.Transporter;
  private hbs: typeof handlebars;
  private readonly templateDir: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {
    this.plainTransporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST', 'mailhog'),
      port: parseInt(this.configService.get('MAIL_PORT', '1025')),
      secure: false,
      ignoreTLS: true,
    });

    this.hbs = handlebars.create();
    this.templateDir = this.findTemplateDirectory();
    
    // Configurer Handlebars AVANT de compiler
    this.configureHandlebars();
    
    this.logger.log(`Template directory: ${this.templateDir}`);
    this.logger.log(`I18n service available: ${!!this.i18nService}`);
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

      this.logger.debug(`Sending email to ${to}, template: ${template}, locale: ${locale}`);

      const mailOptions: any = {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        from: this.configService.get('MAIL_FROM', 'noreply@localhost'),
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      if (template) {
        // ⭐ Utiliser notre compilation personnalisée avec partials et traductions
        const emailHtml = await this.compileWithLayoutAndTranslations(
          template,
          subject,
          context || {},
          locale
        );
        
        mailOptions.html = emailHtml;
        await this.plainTransporter.sendMail(mailOptions);
        
        this.logger.log(`Email '${template}' sent to ${to} with layout and translations`);
        
      } else if (html) {
        mailOptions.html = html;
        await this.plainTransporter.sendMail(mailOptions);
        
      } else if (text) {
        mailOptions.text = text;
        await this.plainTransporter.sendMail(mailOptions);
      }
      
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Compiler avec layout et traductions
   */
  private async compileWithLayoutAndTranslations(
    templateName: string,
    subject: string,
    context: any,
    locale: string
  ): Promise<string> {
    try {
      // 1. Préparer le contexte AVEC TRADUCTIONS
      const fullContext = await this.prepareFullContext(
        templateName,
        subject,
        context,
        locale
      );

      // 2. Lire et compiler le layout
      const layoutPath = path.join(this.templateDir, 'layouts', 'default.hbs');
      if (!fs.existsSync(layoutPath)) {
        throw new Error(`Layout not found: ${layoutPath}`);
      }
      
      const layoutSource = fs.readFileSync(layoutPath, 'utf8');
      const compiledLayout = this.hbs.compile(layoutSource);

      // 3. Lire et compiler le contenu du template
      const templatePath = path.join(this.templateDir, 'emails', `${templateName}.hbs`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }
      
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = this.hbs.compile(templateSource);
      
      // 4. Compiler le contenu AVEC le contexte complet (pour les partials)
      const bodyContent = compiledTemplate(fullContext);

      // 5. Appliquer le layout au contenu
      return compiledLayout({
        ...fullContext,
        body: bodyContent,
      });

    } catch (error) {
      this.logger.error(`Failed to compile email: ${error.message}`);
      this.logger.error('Template:', templateName);
      this.logger.error('Context:', context);
      throw error;
    }
  }

  /**
   * Préparer le contexte COMPLET avec traductions
   */
  private async prepareFullContext(
    templateName: string,
    subject: string,
    context: any,
    locale: string
  ): Promise<any> {
    // 1. Données de base
    const platform = {
      name: this.configService.get('APP_NAME', 'Matsak'),
      url: this.configService.get('FRONTEND_URL', 'http://localhost:3000'),
      supportEmail: this.configService.get('SUPPORT_EMAIL', 'support@matsak.com'),
      logoUrl: `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/images/logos/matsak-logo.svg`,
      ...context.platform,
    };

    // 2. URLs
    const urls = {
      loginUrl: `${platform.url}/auth/login`,
      dashboardUrl: `${platform.url}/dashboard`,
      helpCenterUrl: `${platform.url}/help`,
      contactUrl: `${platform.url}/contact`,
      privacyPolicyUrl: `${platform.url}/privacy`,
      termsUrl: `${platform.url}/terms`,
      ...context.urls,
    };

    // 3. ⭐ CHARGER LES TRADUCTIONS depuis votre service i18n
    let translations = {};
    let commonTranslations = {};
    
    try {
      this.logger.debug(`Loading translations for template: email.${templateName}, locale: ${locale}`);
      
      // Traductions spécifiques au template
      translations = this.i18nService.getTranslations(
        `email.${templateName}`,
        locale as any,
        { ...context, platform, ...urls }
      );

      // Traductions communes
      commonTranslations = this.i18nService.getTranslations(
        'email.common',
        locale as any,
        { 
          year: new Date().getFullYear(),
          platformName: platform.name,
        }
      );
      
      this.logger.debug(`Translations loaded successfully for ${templateName}`);
      
    } catch (i18nError) {
      this.logger.warn(`Could not load i18n translations: ${i18nError.message}`);
    }

    // 4. Construire le contexte final
    return {
      // Métadonnées
      subject,
      locale,
      
      // Données
      user: context.user || {},
      platform,
      ...urls,
      
      // Dates
      year: new Date().getFullYear(),
      currentDate: new Date().toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      
      // TRADUCTIONS 
      t: translations,
      common: commonTranslations,
      
      // Pour que les partials aient accès au contexte
      ...context,
    };
  }

  /**
   * Configurer Handlebars avec les partials
   */
  private configureHandlebars(): void {
    try {
      this.logger.debug('Configuring Handlebars...');
      
      // Enregistrer les partials
      this.registerPartials();
      
      // Ajouter des helpers si nécessaire
      this.hbs.registerHelper('if_eq', function(a, b, opts) {
        if (a === b) {
          return opts.fn(this);
        } else {
          return opts.inverse(this);
        }
      });
      
      // Helper pour formater la date
      this.hbs.registerHelper('formatDate', function(date) {
        return new Date(date).toLocaleDateString('fr-FR');
      });
      
      this.logger.debug('Handlebars configured');
      
    } catch (error) {
      this.logger.error(`Failed to configure Handlebars: ${error.message}`);
    }
  }

  /**
   * Enregistrer tous les partials
   */
  private registerPartials(): void {
    try {
      const partialsDir = path.join(this.templateDir, 'partials');
      
      if (!fs.existsSync(partialsDir)) {
        this.logger.warn(`Partials directory not found: ${partialsDir}`);
        return;
      }

      const partialFiles = fs.readdirSync(partialsDir);
      
      partialFiles.forEach(file => {
        if (file.endsWith('.hbs')) {
          const partialName = path.basename(file, '.hbs');
          const partialPath = path.join(partialsDir, file);
          
          try {
            const partialSource = fs.readFileSync(partialPath, 'utf8');
            this.hbs.registerPartial(partialName, partialSource);
            this.logger.debug(`Registered partial: ${partialName}`);
            
            // Afficher un extrait pour debug
            const preview = partialSource.substring(0, 100).replace(/\n/g, ' ');
            this.logger.debug(`Preview: ${preview}...`);
            
          } catch (readError) {
            this.logger.warn(`Could not read partial ${file}: ${readError.message}`);
          }
        }
      });
      
      this.logger.log(`Registered ${partialFiles.length} partial(s) from ${partialsDir}`);
      
    } catch (error) {
      this.logger.error(`Failed to register partials: ${error.message}`);
    }
  }

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
    this.logger.warn(`Creating template directory: ${defaultPath}`);
    
    fs.mkdirSync(defaultPath, { recursive: true });
    fs.mkdirSync(path.join(defaultPath, 'emails'), { recursive: true });
    fs.mkdirSync(path.join(defaultPath, 'layouts'), { recursive: true });
    fs.mkdirSync(path.join(defaultPath, 'partials'), { recursive: true });
    
    return defaultPath;
  }
}