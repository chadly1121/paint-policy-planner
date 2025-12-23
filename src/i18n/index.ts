import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import tl from './locales/tl.json';

import sopsEn from './locales/content/sops-en.json';
import sopsFr from './locales/content/sops-fr.json';
import sopsEs from './locales/content/sops-es.json';
import sopsTl from './locales/content/sops-tl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en, sops: sopsEn } },
      fr: { translation: { ...fr, sops: sopsFr } },
      es: { translation: { ...es, sops: sopsEs } },
      tl: { translation: { ...tl, sops: sopsTl } },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
