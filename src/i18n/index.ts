import i18next from "x/i18next@v23.4.1/index.js";

import enTranslation from "./locales/en.json" assert { type: "json" };
import zhCNTranslation from "./locales/zh-CN.json" assert { type: "json" };

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
});

const i18n = (lng?: string) => i18next.getFixedT(lng || locale);
const getT = i18n();

export { getT, i18n };
