import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const i18next = require('i18next');

export type SupportedLocale = 'en' | 'fr' | 'zh' | 'ar';

@Injectable()
export class I18nService {
  private i18n: any;
  private initialized = false;

  constructor() {
    this.i18n = i18next.createInstance();
    this.initializeI18n();
  }

  private async initializeI18n() {
    if (this.initialized) return;

    const resources: any = {};
    const locales: SupportedLocale[] = ['en', 'fr', 'zh', 'ar'];

    // Load translation files
    for (const locale of locales) {
      const translationPath = join(__dirname, 'locales', `${locale}.json`);
      try {
        const translationContent = fs.readFileSync(translationPath, 'utf-8');
        resources[locale] = {
          translation: JSON.parse(translationContent),
        };
      } catch (error) {
        console.error(`Failed to load translations for ${locale}:`, error);
      }
    }

    await this.i18n.init({
      lng: 'en', // default language
      fallbackLng: 'en',
      resources,
      interpolation: {
        escapeValue: false, // React/HTML already safe from XSS
      },
    });

    this.initialized = true;
  }

  /**
   * Translate a key with optional interpolation values
   * @param key - Translation key (e.g., 'email.welcome.subject')
   * @param locale - Language code (en, fr, zh, ar)
   * @param interpolation - Optional values for interpolation
   */
  translate(
    key: string,
    locale: SupportedLocale = 'en',
    interpolation?: Record<string, any>,
  ): string {
    return this.i18n.t(key, { lng: locale, ...interpolation });
  }

  /**
   * Get all translations for a specific namespace
   * @param namespace - Namespace (e.g., 'email.welcome')
   * @param locale - Language code
   * @param interpolation - Optional values for interpolation
   */
  getTranslations(
    namespace: string,
    locale: SupportedLocale = 'en',
    interpolation?: Record<string, any>,
  ): Record<string, string> {
    const translations: Record<string, string> = {};
    const keys = this.getKeysFromNamespace(namespace);

    keys.forEach((key) => {
      translations[key] = this.translate(
        `${namespace}.${key}`,
        locale,
        interpolation,
      );
    });

    return translations;
  }

  /**
   * Get available keys from a namespace
   */
  private getKeysFromNamespace(namespace: string): string[] {
    const resource = this.i18n.getResourceBundle('en', 'translation');
    const keys: string[] = [];

    const parts = namespace.split('.');
    let current: any = resource;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      }
    }

    if (current && typeof current === 'object') {
      this.extractKeys(current, keys);
    }

    return keys;
  }

  /**
   * Recursively extract keys from an object
   */
  private extractKeys(obj: any, keys: string[], prefix = ''): void {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        this.extractKeys(obj[key], keys, fullKey);
      } else {
        keys.push(fullKey);
      }
    }
  }

  /**
   * Check if a locale is supported
   */
  isSupportedLocale(locale: string): locale is SupportedLocale {
    return ['en', 'fr', 'zh', 'ar'].includes(locale);
  }
}
