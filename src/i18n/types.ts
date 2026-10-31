export const SUPPORTED_LOCALES = ["en", "zh-Hans", "zh-Hant"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type LocalePreference = "system" | Locale;

/**
 * Widen the English catalog's literal string values so other locales can
 * provide translations while still being forced to match the same key shape.
 */
export type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export const LOCALE_ENDONYMS: Record<Locale, string> = {
  en: "English",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

export const LOCALE_STORAGE_KEY = "souzi-locale";
