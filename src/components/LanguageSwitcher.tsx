import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Globe } from "lucide-react";
import { useLocalePreference } from "../i18n";
import {
  LOCALE_ENDONYMS,
  SUPPORTED_LOCALES,
  type Locale,
} from "../i18n/types";

export function LanguageSwitcher({
  compact = false,
  showAuto = true,
  showHelp = true,
}: {
  compact?: boolean;
  showAuto?: boolean;
  showHelp?: boolean;
}) {
  const { t } = useTranslation();
  const { preference, locale, pending, error, change } =
    useLocalePreference();
  const selectId = useId();
  const helpId = useId();
  const [announcement, setAnnouncement] = useState("");
  const previousLocale = useRef(locale);
  const auto = preference === "system";

  useEffect(() => {
    if (locale === previousLocale.current) return;
    previousLocale.current = locale;
    setAnnouncement(
      t("common.languageChanged", { language: LOCALE_ENDONYMS[locale] }),
    );
  }, [locale, t]);

  const handleLanguage = (next: Locale) => {
    void change(next);
  };

  const handleAuto = () => {
    void change(auto ? locale : "system");
  };

  return (
    <div
      className={`language-switcher ${
        compact ? "language-switcher-compact" : ""
      }`}
    >
      <div className="language-controls">
        <span className="language-select-wrap">
          <select
            id={selectId}
            name="app-language"
            className="language-select"
            value={locale}
            onChange={(event) =>
              handleLanguage(event.target.value as Locale)
            }
            disabled={pending}
            aria-busy={pending}
            aria-label={t("languages.interfaceLanguage")}
            aria-describedby={showHelp ? helpId : undefined}
          >
            {SUPPORTED_LOCALES.map((value) => (
              <option key={value} value={value} lang={value}>
                {LOCALE_ENDONYMS[value]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="language-chevron"
            size={16}
            aria-hidden="true"
          />
        </span>

        {showAuto && (
          <button
            type="button"
            className={`language-auto ${auto ? "language-auto-active" : ""}`}
            aria-pressed={auto}
            aria-label={`${t("languages.auto")} — ${t("languages.followSystem")}`}
            title={t("languages.followSystem")}
            onClick={handleAuto}
            disabled={pending}
          >
            <Globe size={15} aria-hidden="true" />
            <span>{t("languages.auto")}</span>
          </button>
        )}
      </div>

      {showHelp && (
        <p id={helpId} className="language-help">
          {t("languages.help")}
        </p>
      )}

      {error && (
        <p className="language-error" role="status">
          {t("languages.loadError", {
            language: LOCALE_ENDONYMS[error],
            current: LOCALE_ENDONYMS[locale],
          })}
        </p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
