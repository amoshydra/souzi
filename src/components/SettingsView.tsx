import { useEffect, useState } from "react";
import {
  Check,
  Database,
  Download,
  HardDrive,
  Info,
  Languages,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  BeforeInstallPromptEvent,
  DictionaryMeta,
  EnglishCoreMeta,
  Theme,
} from "../types";
import { formatBytes, formatCount, formatDate } from "../lib/format";
import { getStorageEstimate } from "../lib/db";

export function SettingsView({
  meta,
  englishMeta,
  englishStatus,
  theme,
  onThemeChange,
  onImport,
  onReset,
  onClearHistory,
  installPrompt,
  onInstall,
  onAbout,
  onToast,
}: {
  meta: DictionaryMeta | null;
  englishMeta: EnglishCoreMeta | null;
  englishStatus: "loading" | "ready" | "error";
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onImport: () => void;
  onReset: () => Promise<void>;
  onClearHistory: () => Promise<void>;
  installPrompt: BeforeInstallPromptEvent | null;
  onInstall: () => void;
  onAbout: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(
    null,
  );
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let active = true;
    getStorageEstimate().then((estimate) => {
      if (active) setStorage(estimate);
    });
    navigator.storage
      ?.persisted?.()
      .then((value) => {
        if (active) setPersisted(value);
      })
      .catch(() => {
        if (active) setPersisted(false);
      });
    return () => {
      active = false;
    };
  }, [meta, englishMeta]);

  const usagePercent =
    storage && storage.quota > 0
      ? Math.min(100, (storage.usage / storage.quota) * 100)
      : 0;

  const requestPersistence = async () => {
    if (!navigator.storage?.persist) {
      onToast("Persistent storage is not available in this browser", "error");
      return;
    }
    const granted = await navigator.storage.persist();
    setPersisted(granted);
    onToast(
      granted
        ? "Persistent storage granted"
        : "The browser declined persistent storage",
      granted ? "default" : "error",
    );
  };

  const handleReset = async () => {
    setConfirmReset(false);
    await onReset();
    onToast("Full Chinese dictionary removed; starter set restored");
  };

  return (
    <div className="page settings-page">
      <header className="page-heading">
        <div className="section-kicker">Preferences</div>
        <h1>Settings</h1>
        <p>Dictionary data, appearance, and storage.</p>
      </header>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Database size={18} />
          </div>
          <div>
            <h2>Chinese dictionary</h2>
            <p>
              {meta?.kind === "cedict"
                ? "Full Chinese→English CC-CEDICT, imported by you."
                : "Chinese starter sample set. Import CC-CEDICT for full coverage."}
            </p>
          </div>
          <span className={`status-pill ${meta?.kind === "cedict" ? "status-good" : ""}`}>
            {meta?.kind === "cedict" ? "Full" : "Starter"}
          </span>
        </div>

        <div className="settings-stat-grid">
          <div>
            <span>Entries</span>
            <strong>{formatCount(meta?.count ?? 0)}</strong>
          </div>
          <div>
            <span>Imported</span>
            <strong>{meta ? formatDate(meta.importedAt) : "—"}</strong>
          </div>
          <div>
            <span>Source</span>
            <strong className="settings-source">{meta?.source ?? "—"}</strong>
          </div>
        </div>

        <div className="button-row">
          <button type="button" className="button button-primary" onClick={onImport}>
            <Upload size={16} />
            {meta?.kind === "cedict" ? "Replace dictionary" : "Import dictionary"}
          </button>
          {meta?.kind === "cedict" && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw size={16} />
              Remove full dictionary
            </button>
          )}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Languages size={18} />
          </div>
          <div>
            <h2>English → Chinese</h2>
            <p>Bundled ECDICT core. No download required.</p>
          </div>
          <span
            className={`status-pill ${englishStatus === "ready" ? "status-good" : ""}`}
          >
            {englishStatus === "ready"
              ? "Ready"
              : englishStatus === "loading"
                ? "Loading"
                : "Error"}
          </span>
        </div>

        <div className="settings-stat-grid">
          <div>
            <span>Entries</span>
            <strong>
              {englishMeta ? formatCount(englishMeta.count) : "—"}
            </strong>
          </div>
          <div>
            <span>Source</span>
            <strong>ECDICT</strong>
          </div>
          <div>
            <span>License</span>
            <strong>MIT</strong>
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
            <p>Follow your system or choose a theme.</p>
          </div>
        </div>
        <div className="segmented" role="group" aria-label="Theme">
          {[
            { value: "system" as const, label: "System", icon: Monitor },
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
            <HardDrive size={18} />
          </div>
          <div>
            <h2>Storage</h2>
            <p>Everything is stored locally in this browser.</p>
          </div>
        </div>

        <div className="storage-bar">
          <div className="storage-track">
            <div
              className="storage-fill"
              style={{ width: `${Math.max(2, usagePercent)}%` }}
            />
          </div>
          <div className="storage-labels">
            <span>
              {storage ? `${formatBytes(storage.usage)} used` : "Measuring…"}
            </span>
            <span>{storage ? `${formatBytes(storage.quota)} available` : ""}</span>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-row-copy">
            <ShieldCheck size={17} />
            <div>
              <strong>Persistent storage</strong>
              <span>
                {persisted === null
                  ? "Checking…"
                  : persisted
                    ? "Granted. The browser is less likely to evict your dictionary."
                    : "Not granted. The browser may clear data under pressure."}
              </span>
            </div>
          </div>
          {persisted === false && (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={requestPersistence}
            >
              Request
            </button>
          )}
        </div>

        <div className="setting-row">
          <div className="setting-row-copy">
            <Trash2 size={17} />
            <div>
              <strong>Search history</strong>
              <span>Clear recent lookups stored on this device.</span>
            </div>
          </div>
          <button
            type="button"
            className="button button-ghost button-small"
            onClick={async () => {
              await onClearHistory();
              onToast("Search history cleared");
            }}
          >
            Clear
          </button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Smartphone size={18} />
          </div>
          <div>
            <h2>Install app</h2>
            <p>Use Ciqiao full-screen and offline from your home screen.</p>
          </div>
        </div>

        {installPrompt ? (
          <button type="button" className="button button-primary" onClick={onInstall}>
            <Download size={16} />
            Install Ciqiao
          </button>
        ) : (
          <p className="muted install-help">
            On Chrome or Edge, use the install icon in the address bar. On
            iPhone or iPad, tap Share → Add to Home Screen.
          </p>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Info size={18} />
          </div>
          <div>
            <h2>Licenses</h2>
            <p>Data and attribution.</p>
          </div>
        </div>

        <ul className="license-list">
          <li>
            <div>
              <strong>CC-CEDICT</strong>
              <span>Chinese–English dictionary, imported by you.</span>
            </div>
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
          </li>
          <li>
            <div>
              <strong>ECDICT core</strong>
              <span>Filtered English–Chinese entries bundled with Ciqiao.</span>
            </div>
            <a
              href="https://github.com/skywind3000/ECDICT"
              target="_blank"
              rel="noreferrer"
            >
              MIT
            </a>
          </li>
          <li>
            <div>
              <strong>HSK 3.0 word list</strong>
              <span>Vocabulary level tags from ivankra/hsk30.</span>
            </div>
            <a
              href="https://github.com/ivankra/hsk30"
              target="_blank"
              rel="noreferrer"
            >
              MIT
            </a>
          </li>
          <li>
            <div>
              <strong>Word frequency</strong>
              <span>Ranking data from the jieba dictionary.</span>
            </div>
            <a
              href="https://github.com/fxsjy/jieba"
              target="_blank"
              rel="noreferrer"
            >
              MIT
            </a>
          </li>
          <li>
            <div>
              <strong>Starter set</strong>
              <span>Original sample entries written for Ciqiao.</span>
            </div>
            <span className="license-tag">Original</span>
          </li>
          <li>
            <div>
              <strong>App code</strong>
              <span>Ciqiao is an offline-first PWA.</span>
            </div>
            <span className="license-tag">MIT</span>
          </li>
        </ul>

        <div className="about-line">
          <Check size={15} />
          Ciqiao 0.1.0 · No server, no tracking, no account.
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-icon">
            <Info size={18} />
          </div>
          <div>
            <h2>About Ciqiao</h2>
            <p>Why the dictionary is built this way.</p>
          </div>
        </div>
        <button type="button" className="button button-secondary" onClick={onAbout}>
          Open About
        </button>
      </section>

      {confirmReset && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Remove the full dictionary?</h2>
            <p>
              The imported CC-CEDICT entries will be deleted from this device and
              the starter set will be restored. Saved words and history are kept.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="button button-danger"
                onClick={handleReset}
              >
                Remove dictionary
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
