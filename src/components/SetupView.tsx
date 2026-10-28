import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight,
  Download,
  RefreshCw,
  UploadCloud,
  Wifi,
} from "lucide-react";
import type {
  DictionaryMeta,
  EnglishCoreStatus,
  ImportProgress,
} from "../types";
import type { NativeCedictDownload } from "../hooks/useNativeCedictDownload";
import { startCedictImport } from "../lib/cedict-import";
import { getActivePercent } from "../lib/download-progress";
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
  onSkip,
  onNext,
  download,
}: {
  chineseMeta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
  onInstallEnglish: () => void;
  onChineseImported: () => Promise<void>;
  onSkip: () => void;
  onNext: () => void;
  download: NativeCedictDownload;
}) {
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const native = Capacitor.isNativePlatform();

  const chineseReady = chineseMeta?.kind === "cedict";
  const downloadStarted = download.phase !== "idle";
  const activePercent = getActivePercent(download);
  const waitingForWifi =
    download.downloadStatus === "waiting" ||
    (download.downloadStatus === "pending" && download.wifiOnly);

  useEffect(() => {
    if (!importing) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [importing]);

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

  const skipSetup = () => {
    if (importing) {
      workerRef.current?.terminate();
      workerRef.current = null;
      setImporting(false);
      setProgress(null);
    }
    onSkip();
  };

  return (
    <div className="setup-page">
      <div className="setup-shell">
        <header className="setup-header">
          <div className="setup-brand">
            <span aria-hidden="true">
              <Logo size={36} />
            </span>
            <div>
              <div className="setup-brand-name">Souzi</div>
              <div className="setup-brand-sub">搜字</div>
            </div>
          </div>
          <p>
            {englishStatus === "error"
              ? "English dictionary could not be prepared."
              : englishStatus === "loading"
                ? "Getting English dictionary ready…"
                : "English dictionary is ready."}
          </p>
        </header>

        <section className="setup-actions">
          <h1 className="setup-title">
            {chineseReady ? "Chinese dictionary" : "Add Chinese dictionary"}
          </h1>
          {chineseReady ? (
            <p className="setup-installed">Chinese dictionary is ready.</p>
          ) : native ? (
            <div className="setup-download">
              {download.phase === "idle" ? (
                <button
                  type="button"
                  className="button button-primary setup-primary"
                  onClick={() => void download.start()}
                >
                  <Download size={16} />
                  Download
                </button>
              ) : download.phase === "error" ? (
                <>
                  <p className="setup-download-state">Download stopped.</p>
                  <button
                    type="button"
                    className="button button-primary setup-primary"
                    onClick={() => void download.retry()}
                  >
                    <RefreshCw size={16} />
                    Try again
                  </button>
                </>
              ) : (
                <div className="setup-progress">
                  <div className="setup-progress-head">
                    <span>
                      {download.phase === "installing"
                        ? "Preparing dictionary…"
                        : download.phase === "checking"
                          ? "Starting download…"
                          : download.phase === "paused"
                            ? "Download paused."
                            : waitingForWifi
                              ? "Waiting for Wi-Fi…"
                              : download.phase === "done"
                                ? "Download complete."
                                : "Downloading dictionary…"}
                    </span>
                    {activePercent !== null && <span>{activePercent}%</span>}
                  </div>
                  <div
                    className={`progress-track ${
                      activePercent === null || download.phase === "checking"
                        ? "progress-indeterminate"
                        : ""
                    }`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={activePercent ?? undefined}
                    aria-label="Chinese dictionary download progress"
                  >
                    <div
                      className="progress-fill"
                      style={
                        activePercent !== null
                          ? { width: `${activePercent}%` }
                          : undefined
                      }
                    />
                  </div>
                </div>
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
                  <span>Download the file first.</span>
                  <span className="setup-dropzone-actions">
                    <a
                      className="button button-secondary button-small"
                      href={CEDICT_DIRECT}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} />
                      Download
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
          ) : englishStatus === "loading" ? (
            <button
              type="button"
              className="button button-primary setup-next"
              disabled
            >
              Please wait…
            </button>
          ) : chineseReady || downloadStarted ? (
            <button
              type="button"
              className="button button-primary setup-next"
              onClick={onNext}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="button button-secondary setup-next"
              onClick={skipSetup}
            >
              {importing ? "Cancel and skip" : "Skip for now"}
            </button>
          )}
          <p className="setup-privacy">
            Your words never leave this device.
          </p>
        </footer>
      </div>
    </div>
  );
}
