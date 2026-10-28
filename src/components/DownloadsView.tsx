import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Wifi,
  X,
} from "lucide-react";
import type { NativeCedictDownload } from "../hooks/useNativeCedictDownload";
import { getActivePercent } from "../lib/download-progress";
import type { DictionaryMeta, EnglishCoreStatus } from "../types";

export function DownloadsView({
  chineseMeta,
  englishStatus,
  download,
  onBack,
  onInstallEnglish,
  onImport,
}: {
  chineseMeta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
  download: NativeCedictDownload;
  onBack: () => void;
  onInstallEnglish: () => void;
  onImport: () => void;
}) {
  const native = Capacitor.isNativePlatform();
  const chineseReady = chineseMeta?.kind === "cedict";
  const percent = getActivePercent(download);
  const waitingForWifi =
    download.downloadStatus === "waiting" ||
    (download.downloadStatus === "pending" && download.wifiOnly);

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

  return (
    <div className="page downloads-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>

      <header className="page-heading">
        <div className="section-kicker">Dictionaries</div>
        <h1>Downloads</h1>
        <p>Dictionary download status.</p>
      </header>

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

      <p className="download-privacy">
        Dictionary files stay on this device.
      </p>
    </div>
  );
}
