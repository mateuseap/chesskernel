import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './index';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';

const LOCALES = { en, pt, es } as const;
const LANGS = Object.keys(LOCALES) as Array<keyof typeof LOCALES>;

/** Collects dot-notation leaf keys of a nested locale object. */
function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      return leafKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe('locale resources', () => {
  it.each(LANGS)('%s defines non-empty meta.title and meta.description', (lang) => {
    const meta = LOCALES[lang].meta;
    expect(meta.title.length).toBeGreaterThan(0);
    expect(meta.description.length).toBeGreaterThan(0);
    expect(meta.title).toContain('ChessKernel');
  });

  it.each(['pt', 'es'] as const)('%s has exactly the same key set as en', (lang) => {
    expect(leafKeys(LOCALES[lang]).sort()).toEqual(leafKeys(en).sort());
  });

  it('meta titles are actually translated, not copies of the english text', () => {
    expect(pt.meta.title).not.toBe(en.meta.title);
    expect(es.meta.title).not.toBe(en.meta.title);
  });
});

describe('i18n runtime', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('falls back to en and resolves nav keys in every language', async () => {
    expect(i18n.options.fallbackLng).toEqual(['en']);
    for (const lang of LANGS) {
      await i18n.changeLanguage(lang);
      expect(i18n.t('nav.play')).toBe(LOCALES[lang].nav.play);
      expect(i18n.t('nav.login')).toBe(LOCALES[lang].nav.login);
    }
  });

  it('syncs document.title and the meta description on languageChanged', async () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);

    await i18n.changeLanguage('pt');

    expect(document.title).toBe(pt.meta.title);
    expect(meta.getAttribute('content')).toBe(pt.meta.description);

    await i18n.changeLanguage('es');

    expect(document.title).toBe(es.meta.title);
    expect(meta.getAttribute('content')).toBe(es.meta.description);
  });

  it('maps pt to the pt-BR html lang tag and keeps en/es as-is', async () => {
    await i18n.changeLanguage('pt');
    expect(document.documentElement.lang).toBe('pt-BR');

    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');

    await i18n.changeLanguage('es');
    expect(document.documentElement.lang).toBe('es');
  });
});
