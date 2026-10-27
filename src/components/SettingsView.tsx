import {
  Database,
  Download,
  Info,
  Loader2,
  Monitor,
  Moon,
  Plus,
  Sun,
} from "lucide-react";
import type {
  DictionaryMeta,
  EnglishCoreStatus,
  Theme,
} from "../types";

export function SettingsView({
  meta,
  englishStatus,
  theme,
  onThemeChange,
  onImport,
  onInstallEnglish,
  onAbout,
}: {
  meta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onImport: () => void;
  onInstallEnglish: () => void;
  onAbout: () => void;
}) {
  const chineseReady = meta?.kind === "cedict";

  return (
    <div className="page settings-page">
      <header className="page-heading">
        <div className="section-kicker">Preferences</div>
        <h1>Settings</h1>
        <p>Choose your dictionaries and how Souzi looks.</p>
      </header>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Database size={18} />
          </div>
          <div>
            <h2>Dictionaries</h2>
            <p>You can use one direction or both.</p>
          </div>
        </div>

        <div className="dict-list">
          <div className="dict-row">
            <div className="dict-row-copy">
              <strong>English words</strong>
              <span>Find Chinese meanings</span>
            </div>
            {englishStatus === "ready" ? (
              <span className="status-pill status-good">Ready</span>
            ) : (
              <button
                type="button"
                className="button button-primary"
                onClick={onInstallEnglish}
                disabled={englishStatus === "loading"}
              >
                {englishStatus === "loading" ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Download size={16} />
                )}
                {englishStatus === "loading"
                  ? "Installing…"
                  : englishStatus === "error"
                    ? "Try again"
                    : "Add"}
              </button>
            )}
          </div>

          <div className="dict-row">
            <div className="dict-row-copy">
              <strong>Chinese words</strong>
              <span>Find English meanings</span>
            </div>
            {chineseReady ? (
              <span className="status-pill status-good">Ready</span>
            ) : (
              <button
                type="button"
                className="button button-primary"
                onClick={onImport}
              >
                <Plus size={16} />
                Add
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Sun size={18} />
          </div>
          <div>
            <h2>Appearance</h2>
            <p>Choose a light or dark screen, or follow your device.</p>
          </div>
        </div>
        <div className="segmented" role="group" aria-label="Theme">
          {[
            { value: "system" as const, label: "Automatic", icon: Monitor },
            { value: "light" as const, label: "Light", icon: Sun },
            { value: "dark" as const, label: "Dark", icon: Moon },
          ].map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              className={`segment ${theme === value ? "segment-active" : ""}`}
              onClick={() => onThemeChange(value)}
              aria-pressed={theme === value}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Info size={18} />
          </div>
          <div>
            <h2>About Souzi</h2>
            <p>How the app works, privacy, and data credits.</p>
          </div>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={onAbout}
        >
          About Souzi
        </button>
      </section>
    </div>
  );
}
