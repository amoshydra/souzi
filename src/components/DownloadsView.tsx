import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Wifi,
  X,
} from "lucide-react";
import type { NativeCedictDownload } from "../hooks/useNativeCedictDownload";
import type { FullEnglishDownload } from "../hooks/useFullEnglishDownload";
import type { ExamplePackState } from "../hooks/useExamplePack";
import type { RelatedPackState } from "../hooks/useRelatedPack";
import { getActivePercent } from "../lib/download-progress";
import type {
  DictionaryMeta,
  EnglishCoreStatus,
  FullEnglishMeta,
} from "../types";

export function DownloadsView({
  chineseMeta,
  englishStatus,
  download,
  fullEnglishMeta,
  fullDownload,
  examplePack,
  relatedPack,
  onRemoveFullEnglish,
  onBack,
  onInstallEnglish,
  onImport,
  onOpenInstall,
}: {
  chineseMeta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
  download: NativeCedictDownload;
  fullEnglishMeta: FullEnglishMeta | null;
  fullDownload: FullEnglishDownload;
  examplePack: ExamplePackState;
  relatedPack: RelatedPackState;
  onRemoveFullEnglish: () => void;
  onBack: () => void;
  onInstallEnglish: () => void;
  onImport: () => void;
  onOpenInstall: () => void;
}) {
  const native = Capacitor.isNativePlatform();
  const chineseReady = chineseMeta?.kind === "cedict";
  const percent = getActivePercent(download);
  const waitingForWifi =
    download.downloadStatus === "waiting" ||
    (download.downloadStatus === "pending" && download.wifiOnly);
  const fullPercent = getActivePercent(fullDownload);
  const fullWaitingForWifi =
    fullDownload.downloadStatus === "waiting" ||
    (fullDownload.downloadStatus === "pending" && fullDownload.wifiOnly);
  const examplePercent =
    examplePack.progress?.total && examplePack.progress.total > 0
      ? Math.min(
          100,
          Math.round(
            (examplePack.progress.loaded / examplePack.progress.total) * 100,
          ),
        )
      : null;
  const relatedPercent =
    relatedPack.progress?.total && relatedPack.progress.total > 0
      ? Math.min(
          100,
          Math.round(
            (relatedPack.progress.loaded / relatedPack.progress.total) * 100,
          ),
        )
      : null;

  const chineseStatus = chineseReady
    ? "Ready"
    : download.phase === "error"
      ? "Stopped"
      : download.phase === "paused"
        ? "Paused"
        : download.phase === "installing"
          ? "Preparing"
          : download.phase === "checking" ||
              download.phase === "downloading" ||
              download.phase === "done"
            ? "Downloading"
            : "Not added";
  const totalPacks = 5;
  const installedCount = [
    englishStatus === "ready",
    Boolean(fullEnglishMeta),
    chineseReady,
    Boolean(examplePack.meta),
    Boolean(relatedPack.meta),
  ].filter(Boolean).length;
  const updateCount = [
    examplePack.remoteVersion !== null &&
      examplePack.meta !== null &&
      examplePack.remoteVersion > examplePack.meta.version,
    relatedPack.remoteVersion !== null &&
      relatedPack.meta !== null &&
      relatedPack.remoteVersion > relatedPack.meta.version,
  ].filter(Boolean).length;
  const storageBytes =
    (fullEnglishMeta?.size ?? 0) +
    (examplePack.meta?.bytes ?? 0) +
    (relatedPack.meta?.bytes ?? 0);
  const storageLabel =
    storageBytes > 0 ? `${(storageBytes / 1024 / 1024).toFixed(1)} MB` : "0 MB";

  return (
    <div className="page downloads-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>

      <header className="page-heading">
        <div className="section-kicker">Library</div>
        <h1>Packs</h1>
        <p>Dictionaries and extras. Everything stays on this device.</p>
      </header>

      <section className="pack-summary" aria-label="Pack summary">
        <div className="pack-summary-stat">
          <span className="pack-summary-value">
            {installedCount}/{totalPacks}
          </span>
          <span className="pack-summary-label">installed</span>
        </div>
        <div className="pack-summary-stat">
          <span className="pack-summary-value">{storageLabel}</span>
          <span className="pack-summary-label">optional storage</span>
        </div>
        <div className="pack-summary-stat">
          <span className="pack-summary-value">
            {updateCount > 0 ? updateCount : "—"}
          </span>
          <span className="pack-summary-label">
            {updateCount > 0 ? "updates ready" : "up to date"}
          </span>
        </div>
      </section>

      <div className="pack-section-head">
        <h2>Dictionaries</h2>
        <p>Core and full dictionaries.</p>
      </div>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>English dictionary</h2>
            <p>Included with Souzi.</p>
          </div>
          {englishStatus === "ready" ? (
            <span className="status-pill status-good">Ready</span>
          ) : (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={onInstallEnglish}
              disabled={englishStatus === "loading"}
            >
              {englishStatus === "loading" ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              {englishStatus === "loading" ? "Preparing…" : "Try again"}
            </button>
          )}
        </div>
      </section>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>Full English dictionary</h2>
            <p>770,000 English words.</p>
          </div>
          <span
            className={`status-pill ${
              fullEnglishMeta ? "status-good" : "status-muted"
            }`}
          >
            {fullEnglishMeta
              ? "Ready"
              : fullDownload.phase === "error"
                ? "Stopped"
                : fullDownload.phase === "installing"
                  ? "Preparing"
                  : fullDownload.phase === "paused"
                    ? "Paused"
                    : fullDownload.phase === "checking" ||
                        fullDownload.phase === "downloading"
                      ? "Downloading"
                      : "Optional"}
          </span>
        </div>

        {fullEnglishMeta ? (
          <div className="download-card-body">
            <p className="download-ready">
              <CheckCircle2 size={17} />
              Downloaded and ready.
            </p>
            <div className="download-actions">
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={onRemoveFullEnglish}
              >
                <X size={15} />
                Remove
              </button>
            </div>
          </div>
        ) : native ? (
          <div className="download-card-body">
            {fullDownload.phase === "idle" ? (
              <>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void fullDownload.start()}
                >
                  Download
                </button>
                {fullDownload.error && (
                  <p className="download-state download-error">
                    {fullDownload.error}
                  </p>
                )}
              </>
            ) : fullDownload.phase === "error" ? (
              <>
                <p className="download-state">Download stopped.</p>
                <p className="download-state download-error">
                  {fullDownload.error}
                </p>
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => void fullDownload.retry()}
                  >
                    <RefreshCw size={15} />
                    Try again
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void fullDownload.cancel()}
                  >
                    <X size={15} />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="download-progress-head">
                  <span>
                    {fullDownload.phase === "installing"
                      ? "Preparing dictionary…"
                      : fullDownload.phase === "checking"
                        ? "Starting download…"
                        : fullDownload.phase === "paused"
                          ? "Paused."
                          : fullWaitingForWifi
                            ? "Waiting for Wi-Fi…"
                            : fullDownload.phase === "done"
                              ? "Download complete."
                              : "Downloading dictionary…"}
                  </span>
                  {fullPercent !== null && <span>{fullPercent}%</span>}
                </div>
                <div
                  className={`progress-track ${
                    fullPercent === null ||
                    fullDownload.phase === "checking"
                      ? "progress-indeterminate"
                      : ""
                  }`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={fullPercent ?? undefined}
                  aria-label="Full English dictionary download progress"
                >
                  <div
                    className="progress-fill"
                    style={
                      fullPercent !== null
                        ? { width: `${fullPercent}%` }
                        : undefined
                    }
                  />
                </div>

                {fullDownload.phase !== "installing" && (
                  <div className="download-actions">
                    {fullDownload.phase === "paused" ? (
                      <button
                        type="button"
                        className="button button-primary button-small"
                        onClick={() => void fullDownload.resume()}
                      >
                        <Play size={15} />
                        Continue
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => void fullDownload.pause()}
                        disabled={fullDownload.phase === "checking"}
                      >
                        <Pause size={15} />
                        Pause
                      </button>
                    )}
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => void fullDownload.cancel()}
                    >
                      <X size={15} />
                      Cancel
                    </button>
                  </div>
                )}

                <label className="setup-wifi-toggle">
                  <input
                    type="checkbox"
                    checked={fullDownload.wifiOnly}
                    onChange={(event) =>
                      fullDownload.setWifiOnly(event.target.checked)
                    }
                  />
                  <Wifi size={14} />
                  Wi-Fi only
                </label>
              </>
            )}
          </div>
        ) : (
          <div className="download-card-body">
            {native ? (
              <p className="download-state">
                The full English dictionary is available in the Android app.
              </p>
            ) : (
              <button
                type="button"
                className="download-install-notice"
                onClick={onOpenInstall}
              >
                <span>
                  The full English dictionary is available in the Android app.
                  <span className="download-install-cta">How to install</span>
                </span>
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </section>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>Chinese dictionary</h2>
            <p>Chinese to English.</p>
          </div>
          <span
            className={`status-pill ${
              chineseReady ? "status-good" : "status-muted"
            }`}
          >
            {chineseStatus}
          </span>
        </div>

        {chineseReady ? (
          <p className="download-ready">
            <CheckCircle2 size={17} />
            Downloaded and ready.
          </p>
        ) : native ? (
          <div className="download-card-body">
            {download.phase === "idle" ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => void download.start()}
              >
                Download
              </button>
            ) : download.phase === "error" ? (
              <>
                <p className="download-state">Download stopped.</p>
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => void download.retry()}
                  >
                    <RefreshCw size={15} />
                    Try again
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void download.cancel()}
                  >
                    <X size={15} />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="download-progress-head">
                  <span>
                    {download.phase === "installing"
                      ? "Preparing dictionary…"
                      : download.phase === "checking"
                        ? "Starting download…"
                        : download.phase === "paused"
                          ? "Paused."
                          : waitingForWifi
                            ? "Waiting for Wi-Fi…"
                            : download.phase === "done"
                              ? "Download complete."
                              : "Downloading dictionary…"}
                  </span>
                  {percent !== null && <span>{percent}%</span>}
                </div>
                <div
                  className={`progress-track ${
                    percent === null || download.phase === "checking"
                      ? "progress-indeterminate"
                      : ""
                  }`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent ?? undefined}
                  aria-label="Chinese dictionary download progress"
                >
                  <div
                    className="progress-fill"
                    style={percent !== null ? { width: `${percent}%` } : undefined}
                  />
                </div>

                {download.phase !== "installing" && (
                  <div className="download-actions">
                    {download.phase === "paused" ? (
                      <button
                        type="button"
                        className="button button-primary button-small"
                        onClick={() => void download.resume()}
                      >
                        <Play size={15} />
                        Continue
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => void download.pause()}
                        disabled={download.phase === "checking"}
                      >
                        <Pause size={15} />
                        Pause
                      </button>
                    )}
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => void download.cancel()}
                    >
                      <X size={15} />
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            <label className="setup-wifi-toggle">
              <input
                type="checkbox"
                checked={download.wifiOnly}
                onChange={(event) =>
                  download.setWifiOnly(event.target.checked)
                }
              />
              <Wifi size={14} />
              Wi-Fi only
            </label>
          </div>
        ) : (
          <div className="download-card-body">
            <p className="download-state">
              Choose the dictionary file on this device.
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={onImport}
            >
              <Plus size={16} />
              Add dictionary
            </button>
          </div>
        )}
      </section>

      <div className="pack-section-head">
        <h2>Content packs</h2>
        <p>Optional extras for entries.</p>
      </div>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>Example sentences</h2>
            <p>Tatoeba · English–Chinese pairs.</p>
          </div>
          <span
            className={`status-pill ${
              examplePack.meta ? "status-good" : "status-muted"
            }`}
          >
            {examplePack.meta ? "READY" : "OPTIONAL"}
          </span>
        </div>

        <div className="download-card-body">
          {examplePack.meta ? (
            <>
              <p className="download-state">
                {examplePack.meta.entries.toLocaleString()} examples installed ·
                version {examplePack.meta.version}
              </p>
              <p className="download-source">
                From Tatoeba ({examplePack.meta.license}).
              </p>
              <div className="download-actions">
                {examplePack.remoteVersion !== null &&
                  examplePack.remoteVersion > examplePack.meta.version && (
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={() => void examplePack.install()}
                    >
                      <RefreshCw size={15} />
                      Update to v{examplePack.remoteVersion}
                    </button>
                  )}
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => void examplePack.remove()}
                >
                  Remove
                </button>
              </div>
            </>
          ) : examplePack.phase === "loading" ? (
            <p className="download-state">Checking example pack…</p>
          ) : examplePack.phase === "error" ? (
            <>
              <p className="download-state download-error">
                {examplePack.error}
              </p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void examplePack.install()}
                >
                  <RefreshCw size={15} />
                  Try again
                </button>
              </div>
            </>
          ) : examplePack.phase === "checking" ||
            examplePack.phase === "downloading" ||
            examplePack.phase === "installing" ? (
            <>
              <div className="setup-progress">
                <div className="setup-progress-head">
                  <span>
                    {examplePack.phase === "checking"
                      ? "Checking pack…"
                      : examplePack.phase === "installing"
                        ? "Installing examples…"
                        : "Downloading examples…"}
                  </span>
                  {examplePercent !== null && <span>{examplePercent}%</span>}
                </div>
                <div
                  className={`progress-track ${
                    examplePercent === null ? "progress-indeterminate" : ""
                  }`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={examplePercent ?? undefined}
                  aria-label="Example pack download progress"
                >
                  <div
                    className="progress-fill"
                    style={
                      examplePercent !== null
                        ? { width: `${examplePercent}%` }
                        : undefined
                    }
                  />
                </div>
              </div>
              {examplePack.phase !== "installing" && (
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={examplePack.cancel}
                  >
                    <X size={15} />
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="download-state">
                Add real example sentences to English entries. About 1 MB.
              </p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void examplePack.install()}
                >
                  <Plus size={15} />
                  Install
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>Related words</h2>
            <p>WordNet · synonyms and antonyms.</p>
          </div>
          <span
            className={`status-pill ${
              relatedPack.meta ? "status-good" : "status-muted"
            }`}
          >
            {relatedPack.meta ? "READY" : "OPTIONAL"}
          </span>
        </div>

        <div className="download-card-body">
          {relatedPack.meta ? (
            <>
              <p className="download-state">
                {relatedPack.meta.entries.toLocaleString()} relations installed ·
                version {relatedPack.meta.version}
              </p>
              <p className="download-source">
                From {relatedPack.meta.source} ({relatedPack.meta.license}).
              </p>
              <div className="download-actions">
                {relatedPack.remoteVersion !== null &&
                  relatedPack.remoteVersion > relatedPack.meta.version && (
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={() => void relatedPack.install()}
                    >
                      <RefreshCw size={15} />
                      Update to v{relatedPack.remoteVersion}
                    </button>
                  )}
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => void relatedPack.remove()}
                >
                  Remove
                </button>
              </div>
            </>
          ) : relatedPack.phase === "loading" ? (
            <p className="download-state">Checking related-words pack…</p>
          ) : relatedPack.phase === "error" ? (
            <>
              <p className="download-state download-error">
                {relatedPack.error}
              </p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void relatedPack.install()}
                >
                  <RefreshCw size={15} />
                  Try again
                </button>
              </div>
            </>
          ) : relatedPack.phase === "checking" ||
            relatedPack.phase === "downloading" ||
            relatedPack.phase === "installing" ? (
            <>
              <div className="setup-progress">
                <div className="setup-progress-head">
                  <span>
                    {relatedPack.phase === "checking"
                      ? "Checking pack…"
                      : relatedPack.phase === "installing"
                        ? "Installing related words…"
                        : "Downloading related words…"}
                  </span>
                  {relatedPercent !== null && <span>{relatedPercent}%</span>}
                </div>
                <div
                  className={`progress-track ${
                    relatedPercent === null ? "progress-indeterminate" : ""
                  }`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={relatedPercent ?? undefined}
                  aria-label="Related-words pack download progress"
                >
                  <div
                    className="progress-fill"
                    style={
                      relatedPercent !== null
                        ? { width: `${relatedPercent}%` }
                        : undefined
                    }
                  />
                </div>
              </div>
              {relatedPack.phase !== "installing" && (
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={relatedPack.cancel}
                  >
                    <X size={15} />
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="download-state">
                Add synonyms and antonyms to English entries. About 0.6 MB.
              </p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void relatedPack.install()}
                >
                  <Plus size={15} />
                  Install
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <p className="download-privacy">
        Dictionary files stay on this device.
      </p>
    </div>
  );
}
