import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  detectSystemLocale,
  getLocale,
  useLocalePreference,
} from "../i18n";
import {
  LOCALE_ENDONYMS,
  SUPPORTED_LOCALES,
  type LocalePreference,
} from "../i18n/types";

export function SettingsView({
  theme,
  onThemeChange,
  onDownloads,
  onAbout,
}: {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onDownloads: () => void;
  onAbout: () => void;
}) {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t("settings.title"));
  const { preference, pending, change } = useLocalePreference();
  const [languageAnnouncement, setLanguageAnnouncement] = useState("");
  const systemLanguage = LOCALE_ENDONYMS[detectSystemLocale()];

  const handleLanguageChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const next = event.target.value as LocalePreference;
    await change(next);
    setLanguageAnnouncement(
      i18n.t("common.languageChanged", {
        language: LOCALE_ENDONYMS[getLocale()],
      }),
    );
  };

  return (
    <div className="page settings-page">
      <header className="page-heading">
        <div className="section-kicker">{t("settings.kicker")}</div>
        <h1>{t("settings.title")}</h1>
        <p>{t("settings.subtitle")}</p>
      </header>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t("settings.packsTitle")}</h2>
            <p>{t("settings.packsBody")}</p>
          </div>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={onDownloads}
        >
          {t("settings.open")}
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t("settings.languageTitle")}</h2>
            <p>{t("settings.languageBody")}</p>
          </div>
        </div>
        <div className="settings-field">
          <label className="settings-field-label" htmlFor="app-language">
            {t("languages.interfaceLanguage")}
          </label>
          <select
            id="app-language"
            name="app-language"
            className="language-select"
            value={preference}
            onChange={(event) => void handleLanguageChange(event)}
            aria-describedby="app-language-help"
            aria-busy={pending}
            disabled={pending}
          >
            <option value="system">
              {t("languages.systemWithLanguage", {
                language: systemLanguage,
              })}
            </option>
            {SUPPORTED_LOCALES.map((locale) => (
              <option key={locale} value={locale} lang={locale}>
                {LOCALE_ENDONYMS[locale]}
              </option>
            ))}
          </select>
          <p id="app-language-help" className="settings-field-help">
            {t("languages.help")}
          </p>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t("settings.appearanceTitle")}</h2>
            <p>{t("settings.appearanceBody")}</p>
          </div>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label={t("settings.theme")}
        >
          {[
            {
              value: "system" as const,
              label: t("settings.themeSystem"),
              icon: Monitor,
            },
            {
              value: "light" as const,
              label: t("settings.themeLight"),
              icon: Sun,
            },
            {
              value: "dark" as const,
              label: t("settings.themeDark"),
              icon: Moon,
            },
          ].map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              className={`segment ${theme === value ? "segment-active" : ""}`}
              onClick={() => onThemeChange(value)}
              aria-pressed={theme === value}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t("settings.aboutTitle")}</h2>
            <p>{t("settings.aboutBody")}</p>
          </div>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={onAbout}
        >
          {t("settings.aboutButton")}
        </button>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {languageAnnouncement}
      </p>
    </div>
  );
}
