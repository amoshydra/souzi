import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
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
  EnglishCoreStatus,
  ImportProgress,
} from "../types";
import { startCedictImport } from "../lib/cedict-import";
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
      return "Saving words";
    default:
      return "Adding words";
  }
}

export function SetupView({
  chineseMeta,
  englishStatus,
  onInstallEnglish,
  onChineseImported,
  onNext,
}: {
  chineseMeta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
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
  const waitingForChinese = importing || nativeDownload.busy;
  const canContinue = englishStatus === "ready" && !waitingForChinese;

  const startChineseImport = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|gz|zip)$/i.test(file.name)) {
      setError("Please choose the file you downloaded.");
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
          <h1>
            {englishStatus === "error"
              ? "One more try"
              : englishStatus === "loading"
                ? "Getting ready"
                : "Welcome to Souzi"}
          </h1>
          <p>
            {englishStatus === "error"
              ? "English words could not be prepared."
              : englishStatus === "loading"
                ? "Getting English words ready…"
                : "English words are ready."}
          </p>
        </header>

        <section
          className={`setup-card setup-card-single ${
            chineseReady ? "setup-card-ready" : ""
          }`}
        >
            <div className="setup-card-head">
              <div className="setup-card-icon">
                <BookOpen size={22} />
              </div>
              <div className="setup-card-title">
                <h2>Add Chinese words</h2>
              </div>
            </div>

          <p className="setup-card-copy">
            Find English meanings for Chinese words. Works without internet
            after download.
          </p>

          {chineseReady ? (
            <div className="setup-installed">
              <CheckCircle2 size={17} />
              Chinese words are ready.
            </div>
          ) : native ? (
            <div className="setup-download">
              {(nativeDownload.phase === "idle" ||
                nativeDownload.phase === "error") && (
                <>
                  <button
                    type="button"
                    className="button button-primary setup-install-button setup-primary"
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
                      ? "Try again"
                      : "Download Chinese words"}
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
                          ? "Starting download…"
                          : nativeDownload.phase === "installing"
                            ? "Preparing Chinese words…"
                            : nativeDownload.phase === "paused"
                              ? "Paused"
                              : nativeDownload.downloadStatus === "pending" ||
                                  nativeDownload.downloadStatus === "waiting"
                                ? nativeDownload.wifiOnly
                                  ? "Waiting for Wi-Fi…"
                                  : "Starting download…"
                                : "Downloading Chinese words…"}
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
                      aria-label="Chinese words download progress"
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
                      <div className="setup-download-actions">
                        {nativeDownload.phase === "paused" ? (
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={nativeDownload.resume}
                          >
                            <Play size={14} />
                            Continue
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
                  <span>Download the file, then choose it here.</span>
                  <span className="setup-dropzone-actions">
                    <a
                      className="button button-secondary button-small"
                      href={CEDICT_DIRECT}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} />
                      Download file
                    </a>
                    <button
                      type="button"
                      className="button button-primary"
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
                      aria-label="Chinese words import progress"
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
          </section>

        <footer className="setup-footer">
          {englishStatus === "error" ? (
            <button
              type="button"
              className="button button-primary setup-next"
              onClick={onInstallEnglish}
            >
              <RefreshCw size={16} />
              Try again
            </button>
          ) : chineseReady ? (
            <button
              type="button"
              className="button button-primary setup-next"
              onClick={onNext}
              disabled={!canContinue}
            >
              {canContinue ? "Start using Souzi" : "Please wait…"}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="button button-secondary setup-next"
              onClick={onNext}
              disabled={!canContinue}
            >
              {canContinue ? "Skip for now" : "Please wait…"}
            </button>
          )}
          <div className="setup-privacy setup-privacy-center">
            <ShieldCheck size={14} />
            Your words never leave this device.
          </div>
        </footer>
      </div>
    </div>
  );
}
