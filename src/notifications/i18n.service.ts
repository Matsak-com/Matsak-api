import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import * as i18next from 'i18next';

export type SupportedLocale = 'en' | 'fr' | 'zh' | 'ar';

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);
  private i18n: any;
  private initialized = false;
  /** Flat map of all loaded translation files keyed by locale. */
  private readonly resources: Record<string, any> = {};

  constructor() {
    this.i18n = i18next.createInstance();
    // Load all translation files synchronously so translate() works immediately,
    // with no async race condition.
    this.loadResourcesSync();
    // Also initialise i18next in the background for any consumers that use it directly.
    this.initializeI18n().catch((err) =>
      this.logger.error('i18next init failed', err),
    );
  }

  /** Synchronously read every locale JSON into this.resources. */
  private loadResourcesSync(): void {
    const locales: SupportedLocale[] = ['en', 'fr', 'zh', 'ar'];
    for (const locale of locales) {
      const translationPath = join(__dirname, 'locales', `${locale}.json`);
      try {
        const raw = fs.readFileSync(translationPath, 'utf-8');
        this.resources[locale] = JSON.parse(raw);
      } catch (error) {
        this.logger.error(
          `Failed to load translations for ${locale}: ${error.message}`,
        );
        this.resources[locale] = {};
      }
    }
  }

  private async initializeI18n() {
    if (this.initialized) return;

    const i18nResources: any = {};
    for (const locale of Object.keys(this.resources)) {
      i18nResources[locale] = { translation: this.resources[locale] };
    }

    await this.i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: i18nResources,
      interpolation: { escapeValue: true },
    });

    this.initialized = true;
  }

  /**
   * Translate a key with optional interpolation values.
   * Walks the pre-loaded resource tree directly so it works immediately
   * on first request without waiting for the async i18next init.
   *
   * @param key - Dot-separated translation key (e.g. 'email.welcome.subject')
   * @param locale - Language code (en, fr, zh, ar)
   * @param interpolation - Optional values for {{variable}} interpolation
   */
  translate(
    key: string,
    locale: SupportedLocale = 'en',
    interpolation?: Record<string, any>,
  ): string {
    // Walk the pre-loaded resource tree directly.
    const value = this.resolveKey(key, locale)
      ?? this.resolveKey(key, 'en'); // fallback to English

    if (typeof value !== 'string') return '';

    // Apply simple {{variable}} interpolation without depending on i18next.
    if (interpolation) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
        interpolation[k] !== undefined ? String(interpolation[k]) : `{{${k}}}`,
      );
    }
    return value;
  }

  /**
   * Walk the resource tree for the given locale and return the leaf value,
   * or undefined if the key path doesn't exist.
   */
  private resolveKey(key: string, locale: string): string | undefined {
    const parts = key.split('.');
    let node: any = this.resources[locale] ?? {};
    for (const part of parts) {
      if (node === null || typeof node !== 'object') return undefined;
      node = node[part];
    }
    return typeof node === 'string' ? node : undefined;
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
   * Get available keys from a namespace (based on the 'en' reference locale).
   */
  private getKeysFromNamespace(namespace: string): string[] {
    const parts = namespace.split('.');
    let node: any = this.resources['en'] ?? {};
    for (const part of parts) {
      if (node && typeof node === 'object') {
        node = node[part];
      } else {
        node = undefined;
        break;
      }
    }

    const keys: string[] = [];
    if (node && typeof node === 'object') {
      this.extractKeys(node, keys);
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
