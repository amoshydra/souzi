import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Languages,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wifi,
  X,
} from "lucide-react";
import type {
  DictionaryMeta,
  EnglishCoreMeta,
  EnglishCoreStatus,
  ImportProgress,
} from "../types";
import { startCedictImport } from "../lib/cedict-import";
import { formatBytes, formatCount } from "../lib/format";
import { useNativeCedictDownload } from "../hooks/useNativeCedictDownload";
import { Logo } from "./Logo";

const CEDICT_DIRECT =
  "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";

function phaseLabel(phase: ImportProgress["phase"]): string {
  switch (phase) {
    case "read":
      return "Opening file";
    case "decompress":
      return "Opening file";
    case "parse":
      return "Preparing words";
    case "index":
      return "Preparing words";
    case "store":
      return "Saving dictionary";
    default:
      return "Installing";
  }
}

export function SetupView({
  chineseMeta,
  englishStatus,
  englishMeta,
  onInstallEnglish,
  onChineseImported,
  onNext,
}: {
  chineseMeta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
  englishMeta: EnglishCoreMeta | null;
  onInstallEnglish: () => void;
  onChineseImported: () => Promise<void>;
  onNext: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const native = Capacitor.isNativePlatform();
  const nativeDownload = useNativeCedictDownload({
    onInstalled: onChineseImported,
  });

  const chineseReady = chineseMeta?.kind === "cedict";
  const englishReady = englishStatus === "ready";
  const canContinue =
    (chineseReady || englishReady) && !importing && !nativeDownload.busy;

  const startChineseImport = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|gz|zip)$/i.test(file.name)) {
      setError("Please choose the dictionary file you downloaded.");
      return;
    }

    setError("");
    setImporting(true);
    setProgress({
      phase: "read",
      current: 0,
      total: 1,
      message: "Reading file…",
    });

    workerRef.current = startCedictImport(file, {
      onProgress: setProgress,
      onDone: async () => {
        setImporting(false);
        setProgress(null);
        await onChineseImported();
      },
      onError: (message) => {
        setImporting(false);
        setProgress(null);
        setError(message);
      },
    });
  };

  const percent =
    progress && progress.total > 1
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;
  const nativePercent =
    nativeDownload.totalBytes > 0
      ? Math.min(
          100,
          Math.round(
            (nativeDownload.bytesDownloaded / nativeDownload.totalBytes) * 100,
          ),
        )
      : null;
  const installPercent =
    nativeDownload.importProgress && nativeDownload.importProgress.total > 1
      ? Math.min(
          100,
          Math.round(
            (nativeDownload.importProgress.current /
              nativeDownload.importProgress.total) *
              100,
          ),
        )
      : null;
  const chineseStatusLabel = chineseReady
    ? "Ready"
    : native
      ? nativeDownload.phase === "checking"
        ? "Checking"
        : nativeDownload.phase === "downloading"
          ? "Downloading"
          : nativeDownload.phase === "paused"
            ? "Paused"
            : nativeDownload.phase === "installing"
              ? "Installing"
              : nativeDownload.phase === "error"
                ? "Try again"
                : "Not added"
      : importing
        ? "Adding"
        : "Not added";

  return (
    <div className="setup-page">
      <div className="setup-shell">
        <header className="setup-header">
          <div className="setup-brand">
            <Logo size={44} />
            <div>
              <div className="setup-brand-name">Souzi</div>
              <div className="setup-brand-sub">搜字</div>
            </div>
          </div>
          <div className="setup-kicker">Getting started</div>
          <h1>Set up your dictionary</h1>
          <p>
            Choose one or both. You can add the other later.
          </p>
        </header>

        <div className="setup-grid">
          <section className={`setup-card ${englishReady ? "setup-card-ready" : ""}`}>
            <div className="setup-card-head">
              <div className="setup-card-icon">
                <Languages size={22} />
              </div>
              <div className="setup-card-title">
                <h2>English words</h2>
                <span>Find Chinese meanings</span>
              </div>
              <span
                className={`setup-status ${
                  englishReady ? "setup-status-ready" : ""
                }`}
              >
                {englishReady
                  ? "Ready"
                  : englishStatus === "loading"
                    ? "Installing"
                    : englishStatus === "error"
                      ? "Try again"
                      : "Not added"}
              </span>
            </div>

            <p className="setup-card-copy">
              Included with the app. Install it to look up English words.
            </p>

            {englishReady ? (
              <div className="setup-installed">
                <CheckCircle2 size={17} />
                {formatCount(englishMeta?.count ?? 30000)} words · ready to use
              </div>
            ) : (
              <button
                type="button"
                className="button button-primary setup-install-button"
                onClick={onInstallEnglish}
                disabled={englishStatus === "loading"}
              >
                {englishStatus === "loading" ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Download size={16} />
                )}
                {englishStatus === "loading"
                  ? "Installing English…"
                  : englishStatus === "error"
                    ? "Try installing English again"
                    : "Install English dictionary"}
              </button>
            )}

            {englishStatus === "error" && (
              <div className="setup-error">
                The English dictionary could not be installed. Please try again.
              </div>
            )}
          </section>

          <section className={`setup-card ${chineseReady ? "setup-card-ready" : ""}`}>
            <div className="setup-card-head">
              <div className="setup-card-icon">
                <BookOpen size={22} />
              </div>
              <div className="setup-card-title">
                <h2>Chinese words</h2>
                <span>Find English meanings</span>
              </div>
              <span
                className={`setup-status ${
                  chineseReady ? "setup-status-ready" : ""
                }`}
              >
                {chineseStatusLabel}
              </span>
            </div>

            <p className="setup-card-copy">
              Download it once, then look up Chinese words without internet.
            </p>

            {chineseReady ? (
              <div className="setup-installed">
                <CheckCircle2 size={17} />
                {formatCount(chineseMeta.count)} words · ready to use
              </div>
            ) : native ? (
              <div className="setup-download">
                {(nativeDownload.phase === "idle" ||
                  nativeDownload.phase === "error") && (
                  <>
                    <p className="setup-download-copy">
                      Souzi will download the Chinese dictionary for you. It works without internet afterward.
                    </p>
                    <button
                      type="button"
                      className="button button-primary setup-install-button"
                      onClick={
                        nativeDownload.phase === "error"
                          ? nativeDownload.retry
                          : nativeDownload.start
                      }
                    >
                      {nativeDownload.phase === "error" ? (
                        <RefreshCw size={16} />
                      ) : (
                        <Download size={16} />
                      )}
                      {nativeDownload.phase === "error"
                        ? "Try download again"
                        : "Download Chinese dictionary"}
                    </button>
                    {nativeDownload.error && (
                      <div className="setup-error">{nativeDownload.error}</div>
                    )}
                  </>
                )}

                {(nativeDownload.phase === "checking" ||
                  nativeDownload.phase === "downloading" ||
                  nativeDownload.phase === "paused" ||
                  nativeDownload.phase === "installing") && (
                  <div className="setup-progress">
                    <div className="setup-progress-head">
                      <span>
                        {nativeDownload.phase === "checking"
                          ? "Checking download…"
                          : nativeDownload.phase === "installing"
                            ? "Installing dictionary…"
                            : nativeDownload.phase === "paused"
                              ? "Paused"
                              : nativeDownload.downloadStatus === "pending" ||
                                  nativeDownload.downloadStatus === "waiting"
                                ? nativeDownload.wifiOnly
                                  ? "Waiting for Wi-Fi…"
                                  : "Starting download…"
                                : "Downloading Chinese dictionary"}
                      </span>
                      {nativeDownload.phase === "installing" ? (
                        installPercent !== null ? (
                          <span>{installPercent}%</span>
                        ) : (
                          <Loader2 size={14} className="spin" />
                        )
                      ) : nativePercent !== null ? (
                        <span>{nativePercent}%</span>
                      ) : (
                        <Loader2 size={14} className="spin" />
                      )}
                    </div>

                    <div
                      className={`progress-track ${
                        nativeDownload.phase === "installing"
                          ? installPercent === null
                            ? "progress-indeterminate"
                            : ""
                          : nativePercent === null
                            ? "progress-indeterminate"
                            : ""
                      }`}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={
                        nativeDownload.phase === "installing"
                          ? (installPercent ?? undefined)
                          : (nativePercent ?? undefined)
                      }
                      aria-label="Dictionary download progress"
                    >
                      <div
                        className="progress-fill"
                        style={
                          nativeDownload.phase === "installing"
                            ? installPercent !== null
                              ? { width: `${installPercent}%` }
                              : undefined
                            : nativePercent !== null
                              ? { width: `${nativePercent}%` }
                              : undefined
                        }
                      />
                    </div>

                    {nativeDownload.phase !== "installing" && (
                      <>
                        <div className="setup-download-meta">
                          <span>
                            {nativeDownload.totalBytes > 0
                              ? `${formatBytes(nativeDownload.bytesDownloaded)} of ${formatBytes(nativeDownload.totalBytes)}`
                              : "Downloading…"}
                          </span>
                        </div>
                        <div className="setup-download-actions">
                          {nativeDownload.phase === "paused" ? (
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={nativeDownload.resume}
                            >
                              <Play size={14} />
                              Resume
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={nativeDownload.pause}
                              disabled={nativeDownload.phase === "checking"}
                            >
                              <Pause size={14} />
                              Pause
                            </button>
                          )}
                          <button
                            type="button"
                            className="button button-ghost button-small"
                            onClick={nativeDownload.cancel}
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </>
                    )}


                  </div>
                )}

                <label
                  className={`setup-wifi-toggle ${
                    nativeDownload.busy ? "setup-wifi-toggle-disabled" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={nativeDownload.wifiOnly}
                    onChange={(event) =>
                      nativeDownload.setWifiOnly(event.target.checked)
                    }
                    disabled={nativeDownload.busy}
                  />
                  <Wifi size={14} />
                  Use Wi-Fi only
                </label>
              </div>
            ) : (
              <>
                <div
                  className={`setup-dropzone ${dragging ? "setup-dropzone-active" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    if (!importing) startChineseImport(event.dataTransfer.files[0]);
                  }}
                >
                  <FileText size={20} />
                  <span>Download the Chinese dictionary, then choose the file here.</span>
                  <span className="setup-dropzone-actions">
                    <a
                      className="button button-secondary button-small"
                      href={CEDICT_DIRECT}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} />
                      Download Chinese dictionary
                    </a>
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={() => inputRef.current?.click()}
                      disabled={importing}
                    >
                      <UploadCloud size={14} />
                      Choose file
                    </button>
                  </span>
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".txt,.gz,.zip,application/gzip,text/plain"
                  className="sr-only"
                  onChange={(event) => {
                    startChineseImport(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />

                {importing && progress && (
                  <div className="setup-progress">
                    <div className="setup-progress-head">
                      <span>{phaseLabel(progress.phase)}</span>
                      {percent !== null && <span>{percent}%</span>}
                    </div>
                    <div
                      className={`progress-track ${percent === null ? "progress-indeterminate" : ""}`}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent ?? undefined}
                      aria-label="Chinese dictionary import progress"
                    >
                      <div
                        className="progress-fill"
                        style={percent !== null ? { width: `${percent}%` } : undefined}
                      />
                    </div>
                  </div>
                )}

                {error && <div className="setup-error">{error}</div>}
              </>
            )}

            <div className="setup-privacy">
              <ShieldCheck size={14} />
              Saved on this device. Nothing is sent anywhere.
            </div>
          </section>
        </div>

        <footer className="setup-footer">
          {canContinue ? (
            <button
              type="button"
              className="button button-primary setup-next"
              onClick={onNext}
            >
              Start using Souzi
              <ArrowRight size={16} />
            </button>
          ) : (
            <p className="setup-hint">
              Add one dictionary to continue.
            </p>
          )}
          <p className="setup-legal">
            Free dictionary data. Works without internet.
          </p>
        </footer>
      </div>
    </div>
  );
}
