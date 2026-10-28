import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "../types";

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
  return (
    <div className="page settings-page">
      <header className="page-heading">
        <div className="section-kicker">Preferences</div>
        <h1>Settings</h1>
        <p>Downloads and appearance.</p>
      </header>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Downloads</h2>
            <p>Dictionary downloads.</p>
          </div>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={onDownloads}
        >
          Open
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Appearance</h2>
            <p>Choose a screen theme.</p>
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
          <div>
            <h2>About Souzi</h2>
            <p>Privacy and dictionary credits.</p>
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
