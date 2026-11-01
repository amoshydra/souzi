import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronRight,
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
import type { FullEnglishDownload } from "../hooks/useFullEnglishDownload";
import type { FullEnglishMeta } from "../types";
import { startCedictImport } from "../lib/cedict-import";
import { getActivePercent } from "../lib/download-progress";
import {
  AppError,
  translateError,
  type AppError as AppErrorType,
} from "../i18n/errors";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { InstallView } from "./InstallView";

const CEDICT_DIRECT =
  "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";

export function SetupView({
  chineseMeta,
  englishStatus,
  onInstallEnglish,
  onChineseImported,
  onSkip,
  onNext,
  download,
  fullEnglishMeta,
  fullDownload,
}: {
  chineseMeta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
  onInstallEnglish: () => void;
  onChineseImported: () => Promise<void>;
  onSkip: () => void;
  onNext: () => void;
  download: NativeCedictDownload;
  fullEnglishMeta: FullEnglishMeta | null;
  fullDownload: FullEnglishDownload;
}) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<AppErrorType | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const installGuideRef = useRef<HTMLElement>(null);
  const installNoticeRef = useRef<HTMLButtonElement>(null);
  const wasGuideOpen = useRef(false);
  const native = Capacitor.isNativePlatform();

  const chineseReady = chineseMeta?.kind === "cedict";
  const downloadStarted = download.phase !== "idle";
  const activePercent = getActivePercent(download);
  const waitingForWifi =
    download.downloadStatus === "waiting" ||
    (download.downloadStatus === "pending" && download.wifiOnly);

  const phaseLabel = (phase: ImportProgress["phase"]): string => {
    switch (phase) {
      case "read":
      case "decompress":
        return t("setup.phaseRead");
      case "parse":
      case "index":
        return t("setup.phaseParse");
      case "store":
        return t("setup.phaseStore");
      default:
        return t("setup.phaseDefault");
    }
  };

  useEffect(() => {
    if (!importing) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [importing]);

  useEffect(() => {
    if (showInstallGuide) return;
    document.title = t("meta.titleWithPage", {
      page: t("setup.pageTitle"),
    });
  }, [showInstallGuide, t]);

  useEffect(() => {
    if (showInstallGuide) {
      wasGuideOpen.current = true;
      const frame = window.requestAnimationFrame(() => {
        const heading = installGuideRef.current?.querySelector<HTMLElement>("h1");
        if (!heading) return;
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (wasGuideOpen.current) {
      wasGuideOpen.current = false;
      const frame = window.requestAnimationFrame(() => {
        installNoticeRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [showInstallGuide]);

  const startChineseImport = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|gz|zip)$/i.test(file.name)) {
      setError(new AppError("errors.importFileType"));
      return;
    }

    setError(null);
    setImporting(true);
    setProgress({
      phase: "read",
      current: 0,
      total: 1,
    });

    workerRef.current = startCedictImport(file, {
      onProgress: setProgress,
      onDone: async () => {
        setImporting(false);
        setProgress(null);
        await onChineseImported();
      },
      onError: (importError) => {
        setImporting(false);
        setProgress(null);
        setError(importError);
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

  if (showInstallGuide) {
    return (
      <main className="setup-page" ref={installGuideRef}>
        <div className="setup-shell">
          <InstallView onBack={() => setShowInstallGuide(false)} />
        </div>
      </main>
    );
  }

  return (
    <main className="setup-page">
      <div className="setup-shell">
        <h1 className="sr-only">{t("setup.title")}</h1>
        <header className="setup-header">
          <div className="setup-brand-row">
            <div className="setup-brand">
              <span aria-hidden="true">
                <Logo size={36} />
              </span>
              <div>
                <div className="setup-brand-name">{t("app.name")}</div>
                <div className="setup-brand-sub" lang="zh">
                  {t("app.brandHan")}
                </div>
              </div>
            </div>
            <div className="setup-language">
              <LanguageSwitcher
                compact
                showAuto={false}
                showHelp={false}
              />
            </div>
          </div>
          <p aria-live="polite">
            {englishStatus === "error"
              ? t("setup.englishError")
              : englishStatus === "loading"
                ? t("setup.englishLoading")
                : t("setup.englishReady")}
          </p>
        </header>

        <section className="setup-actions" aria-labelledby="setup-chinese-title">
          <h2 className="setup-title" id="setup-chinese-title">
            {chineseReady
              ? t("setup.chineseTitle")
              : t("setup.addChineseTitle")}
          </h2>
          <p className="setup-size">{t("setup.chineseSize")}</p>
          {chineseReady ? (
            <p className="setup-installed">{t("setup.chineseReady")}</p>
          ) : native ? (
            <div className="setup-download">
              {download.phase === "idle" ? (
                <button
                  type="button"
                  className="button button-primary setup-primary"
                  onClick={() => void download.start()}
                >
                  <Download size={16} aria-hidden="true" />
                  {t("common.download")}
                </button>
              ) : download.phase === "error" ? (
                <>
                  <p className="setup-download-state">
                    {t("setup.downloadStopped")}
                  </p>
                  {download.error && (
                    <p className="setup-error" role="alert">
                      {translateError(t, download.error)}
                    </p>
                  )}
                  <button
                    type="button"
                    className="button button-primary setup-primary"
                    onClick={() => void download.retry()}
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    {t("common.retry")}
                  </button>
                </>
              ) : (
                <div className="setup-progress">
                  <div className="setup-progress-head">
                    <span>
                      {download.phase === "installing"
                        ? t("common.preparingDictionary")
                        : download.phase === "checking"
                          ? t("common.startingDownload")
                          : download.phase === "paused"
                            ? t("setup.downloadPaused")
                            : waitingForWifi
                              ? t("common.waitingForWifi")
                              : download.phase === "done"
                                ? t("common.downloadComplete")
                                : t("common.downloadingDictionary")}
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
                    aria-valuetext={
                      activePercent !== null
                        ? `${t("common.downloadingDictionary")} ${activePercent}%`
                        : t("common.preparingDictionary")
                    }
                    aria-label={t("a11y.chineseDownloadProgress")}
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
                  id="setup-chinese-wifi"
                  name="chinese-wifi-only"
                  type="checkbox"
                  checked={download.wifiOnly}
                  onChange={(event) =>
                    download.setWifiOnly(event.target.checked)
                  }
                />
                <Wifi size={14} aria-hidden="true" />
                {t("common.wifiOnly")}
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
                  <span>{t("setup.fileFirst")}</span>
                  <span className="setup-dropzone-actions">
                    <a
                      className="button button-primary"
                      href={CEDICT_DIRECT}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} aria-hidden="true" />
                      {t("common.download")}
                    </a>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => inputRef.current?.click()}
                      disabled={importing}
                    >
                      <UploadCloud size={14} aria-hidden="true" />
                      {t("setup.chooseFile")}
                    </button>
                  </span>
                </div>

                <input
                  ref={inputRef}
                  id="setup-cedict-file"
                  name="cedict-file"
                  type="file"
                  accept=".txt,.gz,.zip,application/gzip,text/plain"
                  hidden
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
                      aria-valuetext={
                        percent !== null
                          ? `${phaseLabel(progress.phase)} ${percent}%`
                          : phaseLabel(progress.phase)
                      }
                      aria-label={t("a11y.chineseImportProgress")}
                    >
                      <div
                        className="progress-fill"
                        style={percent !== null ? { width: `${percent}%` } : undefined}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="setup-error" role="alert">
                    {translateError(t, error)}
                  </div>
                )}
              </>
            )}
        </section>

        <section className="setup-actions" aria-labelledby="setup-english-title">
          <h2 className="setup-title" id="setup-english-title">
            {fullEnglishMeta
              ? t("setup.fullEnglishTitle")
              : t("setup.addFullEnglishTitle")}
          </h2>
          <p className="setup-size">{t("setup.fullEnglishSize")}</p>
          {fullEnglishMeta ? (
            <p className="setup-installed">{t("setup.fullEnglishReady")}</p>
          ) : native ? (
            <div className="setup-download">
              {fullDownload.phase === "idle" ? (
                <button
                  type="button"
                  className="button button-primary setup-primary"
                  onClick={() => void fullDownload.start()}
                >
                  <Download size={16} aria-hidden="true" />
                  {t("common.download")}
                </button>
              ) : fullDownload.phase === "error" ? (
                <>
                  <p className="setup-download-state">
                    {t("setup.downloadStopped")}
                  </p>
                  {fullDownload.error && (
                    <p className="setup-error" role="alert">
                      {translateError(t, fullDownload.error)}
                    </p>
                  )}
                  <button
                    type="button"
                    className="button button-primary setup-primary"
                    onClick={() => void fullDownload.retry()}
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    {t("common.retry")}
                  </button>
                </>
              ) : (
                <div className="setup-progress">
                  <div className="setup-progress-head">
                    <span>
                      {fullDownload.phase === "installing"
                        ? t("common.preparingDictionary")
                        : fullDownload.phase === "checking"
                          ? t("common.startingDownload")
                          : fullDownload.phase === "paused"
                            ? t("setup.downloadPaused")
                            : fullDownload.downloadStatus === "waiting" ||
                                (fullDownload.downloadStatus === "pending" &&
                                  fullDownload.wifiOnly)
                              ? t("common.waitingForWifi")
                              : t("common.downloadingDictionary")}
                    </span>
                    {(() => {
                      const fullPercent =
                        fullDownload.totalBytes > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (fullDownload.bytesDownloaded /
                                  fullDownload.totalBytes) *
                                  100,
                              ),
                            )
                          : null;
                      return (
                        <>
                          {fullPercent !== null && <span>{fullPercent}%</span>}
                        </>
                      );
                    })()}
                  </div>
                  <div
                    className={`progress-track ${
                      fullDownload.totalBytes === 0 ||
                      fullDownload.phase === "checking"
                        ? "progress-indeterminate"
                        : ""
                    }`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={
                      fullDownload.totalBytes > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (fullDownload.bytesDownloaded /
                                fullDownload.totalBytes) *
                                100,
                            ),
                          )
                        : undefined
                    }
                    aria-valuetext={
                      fullDownload.totalBytes > 0
                        ? `${t("common.downloadingDictionary")} ${Math.min(
                            100,
                            Math.round(
                              (fullDownload.bytesDownloaded /
                                fullDownload.totalBytes) *
                                100,
                            ),
                          )}%`
                        : t("common.preparingDictionary")
                    }
                    aria-label={t("a11y.fullEnglishDownloadProgress")}
                  >
                    <div
                      className="progress-fill"
                      style={
                        fullDownload.totalBytes > 0
                          ? {
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (fullDownload.bytesDownloaded /
                                    fullDownload.totalBytes) *
                                    100,
                                ),
                              )}%`,
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}
              <label className="setup-wifi-toggle">
                <input
                  id="setup-full-english-wifi"
                  name="full-english-wifi-only"
                  type="checkbox"
                  checked={fullDownload.wifiOnly}
                  onChange={(event) =>
                    fullDownload.setWifiOnly(event.target.checked)
                  }
                />
                <Wifi size={14} aria-hidden="true" />
                {t("common.wifiOnly")}
              </label>
            </div>
          ) : (
            <button
              type="button"
              className="download-install-notice setup-install-notice"
              onClick={() => setShowInstallGuide(true)}
              ref={installNoticeRef}
            >
              <span>
                {t("setup.fullAvailableAndroid")}
                <span className="download-install-cta">
                  {t("setup.howToInstall")}
                </span>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )}
        </section>

        <footer className="setup-footer">
          {englishStatus === "error" ? (
            <button
              type="button"
              className="button button-primary setup-next"
              onClick={onInstallEnglish}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {t("common.retry")}
            </button>
          ) : englishStatus === "loading" ? (
            <button
              type="button"
              className="button button-primary setup-next"
              disabled
            >
              {t("setup.pleaseWait")}
            </button>
          ) : chineseReady || downloadStarted ? (
            <button
              type="button"
              className="button button-primary setup-next"
              onClick={onNext}
            >
              {t("setup.continue")}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="button button-secondary setup-next"
              onClick={skipSetup}
            >
              {importing ? t("setup.cancelAndSkip") : t("setup.skip")}
            </button>
          )}
          <p className="setup-privacy">{t("setup.privacy")}</p>
        </footer>
      </div>
    </main>
  );
}
