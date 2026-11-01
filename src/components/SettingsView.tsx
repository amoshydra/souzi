import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { LanguageSwitcher } from "./LanguageSwitcher";

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
  const { t } = useTranslation();
  useDocumentTitle(t("settings.title"));

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
        <LanguageSwitcher />
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

    </div>
  );
}
