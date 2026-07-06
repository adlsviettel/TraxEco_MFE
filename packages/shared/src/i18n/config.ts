import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';
import id from './locales/id.json';
import th from './locales/th.json';
import km from './locales/km.json';

// Get saved language, default to Vietnamese
const savedLng = localStorage.getItem('i18nextLng');
// If saved language is not one of our supported languages, reset to 'vi'
const supportedLngs = ['en', 'vi', 'id', 'th', 'km'];
const initialLng = savedLng && supportedLngs.includes(savedLng) ? savedLng : 'vi';

// Ensure localStorage always has the correct value
if (!savedLng || !supportedLngs.includes(savedLng)) {
  localStorage.setItem('i18nextLng', 'vi');
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      id: { translation: id },
      th: { translation: th },
      km: { translation: km }
    },
    lng: initialLng,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
