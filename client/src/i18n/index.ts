import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';

const saved = localStorage.getItem('chesskernel-lang') ?? navigator.language.split('-')[0];
const lng = ['en', 'pt', 'es'].includes(saved) ? saved : 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, pt: { translation: pt }, es: { translation: es } },
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Full BCP 47 tags for the html lang attribute. */
const HTML_LANG: Record<string, string> = { en: 'en', pt: 'pt-BR', es: 'es' };

/** Keeps tab title, meta description, and html lang in the active language. */
function syncDocumentLanguage(language: string): void {
  document.title = i18n.t('meta.title');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description'));
  document.documentElement.lang = HTML_LANG[language] ?? language;
}

syncDocumentLanguage(lng);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
