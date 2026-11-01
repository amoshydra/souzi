import { useCallback, useEffect, useState } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import {
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type Locale,
  type LocalePreference,
} from "./types";

export type { Locale, LocalePreference };

const SYSTEM_LANGUAGES_FALLBACK: readonly string[] = ["en"];

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function readLocalePreference(): LocalePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "system" || (stored && isLocale(stored))) {
      return stored as LocalePreference;
    }
  } catch {
    // Storage can be unavailable in private modes.
  }
  return "system";
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return SYSTEM_LANGUAGES_FALLBACK;
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  return languages.length > 0 ? languages : SYSTEM_LANGUAGES_FALLBACK;
}

/**
 * Map a browser language tag to one of the bundled app locales.
 *
 * Script subtags win over region: zh-Hans-HK is Simplified, zh-Hant-CN is
 * Traditional. Without a script, TW/HK/MO use Traditional and other zh tags
 * use Simplified. Unsupported languages fall back to English.
 */
export function resolveLocale(tags: readonly string[]): Locale {
  for (const raw of tags) {
    const tag = raw.toLowerCase();
    if (tag === "zh" || tag.startsWith("zh-")) {
      const subtags = tag.split("-");
      if (subtags.includes("hant")) return "zh-Hant";
      if (subtags.includes("hans")) return "zh-Hans";
      if (
        subtags.includes("tw") ||
        subtags.includes("hk") ||
        subtags.includes("mo")
      ) {
        return "zh-Hant";
      }
      return "zh-Hans";
    }
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}

export function detectSystemLocale(): Locale {
  return resolveLocale(browserLanguages());
}

export function resolveLocalePreference(preference: LocalePreference): Locale {
  return preference === "system" ? detectSystemLocale() : preference;
}

export function getLocale(): Locale {
  const resolved = i18n.resolvedLanguage ?? i18n.language;
  return resolved && isLocale(resolved) ? resolved : "en";
}

export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = i18n.dir(locale);
}

// English is always available as the fallback and costs one small catalog.
// Other locales are separate chunks, fetched only when selected.
const localeLoaders: Record<
  Exclude<Locale, "en">,
  () => Promise<unknown>
> = {
  "zh-Hans": () => import("./locales/zh-Hans").then((module) => module.zhHans),
  "zh-Hant": () => import("./locales/zh-Hant").then((module) => module.zhHant),
};

const loadedLocales = new Set<Locale>(["en"]);
const loadingLocales = new Map<Locale, Promise<void>>();
let localeLoadError: Locale | null = null;

/** The locale whose chunk failed to load most recently, if any. */
export function getLocaleLoadError(): Locale | null {
  return localeLoadError;
}

export async function ensureLocale(locale: Locale): Promise<void> {
  if (locale === "en" || loadedLocales.has(locale)) return;

  let pending = loadingLocales.get(locale);
  if (!pending) {
    pending = (async () => {
      const loader = localeLoaders[locale];
      if (!loader) return;
      const messages = await loader();
      i18n.addResourceBundle(locale, "translation", messages, true, true);
      loadedLocales.add(locale);
      loadingLocales.delete(locale);
      if (localeLoadError === locale) localeLoadError = null;
    })().catch((reason) => {
      loadingLocales.delete(locale);
      throw reason;
    });
    loadingLocales.set(locale, pending);
  }

  await pending;
}

/**
 * Load the active locale before the first React render. English stays in the
 * main chunk; zh-Hans / zh-Hant are dynamic imports.
 */
let initPromise: Promise<Locale> | null = null;

export function initI18n(): Promise<Locale> {
  if (!initPromise) {
    initPromise = (async () => {
      const locale = resolveLocalePreference(readLocalePreference());
      try {
        await ensureLocale(locale);
        if (locale !== "en") {
          await i18n.changeLanguage(locale);
        }
      } catch (reason) {
        localeLoadError = locale;
        console.warn("Could not load locale; falling back to English.", reason);
      }
      applyDocumentLocale(getLocale());
      return getLocale();
    })();
  }
  return initPromise;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: [...SUPPORTED_LOCALES],
  nonExplicitSupportedLngs: false,
  load: "currentOnly",
  interpolation: {
    // React escapes rendered strings; escaping again would display &amp; etc.
    escapeValue: false,
  },
  returnNull: false,
  initAsync: false,
});

applyDocumentLocale(getLocale());

export async function setLocalePreference(
  preference: LocalePreference,
): Promise<Locale> {
  const locale = resolveLocalePreference(preference);

  try {
    await ensureLocale(locale);
    if (i18n.resolvedLanguage !== locale) {
      await i18n.changeLanguage(locale);
    }
  } catch (reason) {
    localeLoadError = locale;
    console.warn("Could not switch locale; keeping the current language.", reason);
    return getLocale();
  }

  localeLoadError = null;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, preference);
  } catch {
    // The current session can still switch language without persistence.
  }

  applyDocumentLocale(locale);

  window.dispatchEvent(
    new CustomEvent("souzi-locale-change", {
      detail: { preference, locale },
    }),
  );
  return locale;
}

/**
 * Language preference for the Settings and Setup selectors. `change` persists
 * the preference and updates i18next; components re-render through
 * `useTranslation`.
 */
export function useLocalePreference(): {
  preference: LocalePreference;
  locale: Locale;
  pending: boolean;
  error: Locale | null;
  change: (preference: LocalePreference) => Promise<void>;
} {
  const [preference, setPreferenceState] =
    useState<LocalePreference>(readLocalePreference);
  const [locale, setLocaleState] = useState<Locale>(getLocale);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Locale | null>(getLocaleLoadError);

  useEffect(() => {
    const sync = () => {
      setPreferenceState(readLocalePreference());
      setLocaleState(getLocale());
    };
    window.addEventListener("souzi-locale-change", sync);
    return () => window.removeEventListener("souzi-locale-change", sync);
  }, []);

  // When following the system, pick up a device language change when the user
  // returns to the app. Android's configChanges includes locale, so the
  // activity is not recreated for us.
  useEffect(() => {
    if (preference !== "system") return;

    const sync = () => {
      const next = detectSystemLocale();
      if (i18n.resolvedLanguage === next) return;
      void ensureLocale(next)
        .then(() => i18n.changeLanguage(next))
        .then(() => {
          applyDocumentLocale(next);
          setLocaleState(next);
          setError(null);
        })
        .catch(() => {
          localeLoadError = next;
          setError(next);
        });
    };

    window.addEventListener("languagechange", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [preference]);

  const change = useCallback(async (next: LocalePreference) => {
    // Prefer the requested language while its chunk loads, but only if it
    // actually resolves; otherwise revert to the stored preference.
    const target = resolveLocalePreference(next);
    setPreferenceState(next);
    setPending(true);
    setError(null);
    try {
      const resolved = await setLocalePreference(next);
      setPreferenceState(readLocalePreference());
      setLocaleState(resolved);
      if (resolved !== target) setError(target);
    } finally {
      setPending(false);
    }
  }, []);

  return { preference, locale, pending, error, change };
}

export { i18n };
