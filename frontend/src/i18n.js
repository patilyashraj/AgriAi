import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";

const LANGUAGE_STORAGE_KEY = "language";
const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  supportedLngs: ["en", "hi", "mr"],
  interpolation: { escapeValue: false },
});

export { LANGUAGE_STORAGE_KEY };
export default i18n;

