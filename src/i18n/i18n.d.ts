import "i18next";
import type { EnglishCatalog } from "./locales/en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: EnglishCatalog;
    };
  }
}
