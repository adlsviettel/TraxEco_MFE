import i18n from 'i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';
import th from './locales/th.json';
import km from './locales/km.json';
import id from './locales/id.json';

// Merge IT Inventory translations into existing i18n instance
// (avoids re-initializing i18n which conflicts with TraxEco's i18n)
const itResources = { en, vi, th, km, id };

Object.entries(itResources).forEach(([lng, translations]) => {
  // Add as 'it_inventory' namespace to avoid key conflicts
  i18n.addResourceBundle(lng, 'translation', translations, true, true);
});

export default i18n;
