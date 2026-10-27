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
      return "Reading file";
    case "decompress":
      return "Decompressing";
    case "parse":
      return "Parsing entries";
    case "index":
      return "Building indexes";
    case "store":
      return "Saving to this device";
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
      setError("Choose a .txt, .gz, or .zip CC-CEDICT file.");
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
    ? "Installed"
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
                ? "Retry"
                : "Not installed"
      : importing
        ? "Importing"
        : "Not installed";

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
          <div className="setup-kicker">First-time setup</div>
          <h1>Choose your dictionaries</h1>
          <p>
            Install at least one. You can add the other direction later from
            Settings.
          </p>
        </header>

        <div className="setup-grid">
          <section className={`setup-card ${englishReady ? "setup-card-ready" : ""}`}>
            <div className="setup-card-head">
              <div className="setup-card-icon">
                <Languages size={22} />
              </div>
              <div className="setup-card-title">
                <h2>English → Chinese</h2>
                <span>30,000-entry ECDICT core</span>
              </div>
              <span
                className={`setup-status ${
                  englishReady ? "setup-status-ready" : ""
                }`}
              >
                {englishReady
                  ? "Installed"
                  : englishStatus === "loading"
                    ? "Installing"
                    : englishStatus === "error"
                      ? "Retry"
                      : "Not installed"}
              </span>
            </div>

            <p className="setup-card-copy">
              Common words, exam vocabulary, IPA, and Chinese translations.
              Included with the app.
            </p>

            {englishReady ? (
              <div className="setup-installed">
                <CheckCircle2 size={17} />
                {formatCount(englishMeta?.count ?? 30000)} entries · available
                offline
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
                    ? "Retry English install"
                    : "Install English dictionary"}
              </button>
            )}

            {englishStatus === "error" && (
              <div className="setup-error">
                The English core could not be installed. Check storage and try
                again.
              </div>
            )}
          </section>

          <section className={`setup-card ${chineseReady ? "setup-card-ready" : ""}`}>
            <div className="setup-card-head">
              <div className="setup-card-icon">
                <BookOpen size={22} />
              </div>
              <div className="setup-card-title">
                <h2>Chinese → English</h2>
                <span>Full CC-CEDICT</span>
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
              The full Chinese dictionary: {formatCount(125320)} entries,
              pinyin, traditional forms, and classifiers.
            </p>

            {chineseReady ? (
              <div className="setup-installed">
                <CheckCircle2 size={17} />
                {formatCount(chineseMeta.count)} entries · available offline
              </div>
            ) : native ? (
              <div className="setup-download">
                {(nativeDownload.phase === "idle" ||
                  nativeDownload.phase === "error") && (
                  <>
                    <p className="setup-download-copy">
                      Souzi downloads the official CC-CEDICT export directly,
                      then parses it on this device.
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
                        ? "Retry CC-CEDICT download"
                        : "Download CC-CEDICT"}
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
                                : "Downloading CC-CEDICT"}
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
                      aria-label="CC-CEDICT download progress"
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
                            {formatBytes(nativeDownload.bytesDownloaded)}
                            {nativeDownload.totalBytes > 0
                              ? ` / ${formatBytes(nativeDownload.totalBytes)}`
                              : ""}
                          </span>
                          {nativeDownload.speed > 0 && (
                            <span>{formatBytes(nativeDownload.speed)}/s</span>
                          )}
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

                    {nativeDownload.phase === "installing" &&
                      nativeDownload.importProgress && (
                        <p className="progress-message">
                          {nativeDownload.importProgress.message}
                        </p>
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
                  Download over Wi-Fi only
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
                  <span>Download from MDBG, then import the file here.</span>
                  <span className="setup-dropzone-actions">
                    <a
                      className="button button-secondary button-small"
                      href={CEDICT_DIRECT}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} />
                      Download CC-CEDICT
                    </a>
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={() => inputRef.current?.click()}
                      disabled={importing}
                    >
                      <UploadCloud size={14} />
                      Import file
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
              {native
                ? "Downloaded by the app and parsed on this device. Nothing is uploaded."
                : "Parsed on this device. Nothing is uploaded."}
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
              Continue to dictionary
              <ArrowRight size={16} />
            </button>
          ) : (
            <p className="setup-hint">
              Install at least one dictionary to continue.
            </p>
          )}
          <p className="setup-legal">
            ECDICT core · MIT · CC-CEDICT · CC BY-SA 4.0. Both stay offline on
            this device.
          </p>
        </footer>
      </div>
    </div>
  );
}
