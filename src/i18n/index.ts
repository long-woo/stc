import i18next from "i18next";

import enTranslation from "./locales/en.json" with { type: "json" };
import zhCNTranslation from "./locales/zh-CN.json" with { type: "json" };

const locale = Intl.DateTimeFormat().resolvedOptions().locale;

i18next.init({
  resources: {
    en: {
      translation: enTranslation,
    },
    "zh-CN": {
      translation: zhCNTranslation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const i18n = (lng?: string) => i18next.getFixedT(lng || locale);
const getT = i18n();

export { getT, i18n };
