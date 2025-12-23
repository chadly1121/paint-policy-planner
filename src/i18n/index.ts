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

import policiesEn from './locales/content/policies-en.json';
import policiesFr from './locales/content/policies-fr.json';
import policiesEs from './locales/content/policies-es.json';
import policiesTl from './locales/content/policies-tl.json';

import safetyEn from './locales/content/safety-en.json';
import safetyFr from './locales/content/safety-fr.json';
import safetyEs from './locales/content/safety-es.json';
import safetyTl from './locales/content/safety-tl.json';

import trainingEn from './locales/content/training-en.json';
import trainingFr from './locales/content/training-fr.json';
import trainingEs from './locales/content/training-es.json';
import trainingTl from './locales/content/training-tl.json';

import disciplinaryEn from './locales/content/disciplinary-en.json';
import disciplinaryFr from './locales/content/disciplinary-fr.json';
import disciplinaryEs from './locales/content/disciplinary-es.json';
import disciplinaryTl from './locales/content/disciplinary-tl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en, sops: sopsEn, policies: policiesEn, safety: safetyEn, training: trainingEn, disciplinary: disciplinaryEn } },
      fr: { translation: { ...fr, sops: sopsFr, policies: policiesFr, safety: safetyFr, training: trainingFr, disciplinary: disciplinaryFr } },
      es: { translation: { ...es, sops: sopsEs, policies: policiesEs, safety: safetyEs, training: trainingEs, disciplinary: disciplinaryEs } },
      tl: { translation: { ...tl, sops: sopsTl, policies: policiesTl, safety: safetyTl, training: trainingTl, disciplinary: disciplinaryTl } },
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
