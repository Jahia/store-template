import i18next, { type i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

/**
 * Self-contained i18next instance for the admin islands, bundling the
 * privateappstore translations under the "privateappstore" namespace.
 *
 * The ported admin components call `useTranslation("privateappstore")`, so we
 * provide a dedicated instance via <I18nextProvider> rather than relying on the
 * engine's own (store-template-scoped) i18n. The useTranslation/I18nextProvider
 * API is stable across react-i18next majors, so the components work unchanged.
 */
let instance: i18n | null = null;

export function getAdminI18n(language: string = "en"): i18n {
  if (!instance) {
    instance = i18next.createInstance();
    instance.use(initReactI18next).init({
      lng: language,
      fallbackLng: "en",
      ns: ["privateappstore"],
      defaultNS: "privateappstore",
      resources: { en: { privateappstore: en }, fr: { privateappstore: fr } },
      interpolation: { escapeValue: false },
    });
  } else if (instance.language !== language) {
    instance.changeLanguage(language);
  }
  return instance;
}
