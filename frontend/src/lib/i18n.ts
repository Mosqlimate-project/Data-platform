import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from '../../public/locales/en/common.json';
import commonPt from '../../public/locales/pt/common.json';
import commonEs from '../../public/locales/es/common.json';

const resources = {
  en: { common: commonEn },
  pt: { common: commonPt },
  es: { common: commonEs },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
