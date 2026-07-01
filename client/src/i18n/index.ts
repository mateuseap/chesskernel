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

export default i18n;
