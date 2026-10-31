import { useTranslation } from "react-i18next";
import { ChevronRight, Loader2, Pause, Play, RefreshCw, X } from "lucide-react";
import type { NativeCedictDownload } from "../hooks/useNativeCedictDownload";

export function ChineseDownloadBanner({
  download,
  onOpenDownloads,
}: {
  download: NativeCedictDownload;
  onOpenDownloads: () => void;
}) {
  const { t } = useTranslation();

  if (download.phase === "idle" || download.phase === "done") return null;

  const installing = download.phase === "installing";
  const failed = download.phase === "error";
  const paused = download.phase === "paused";
  const waiting =
    download.downloadStatus === "waiting" ||
    (download.downloadStatus === "pending" && download.wifiOnly);

  const downloadPercent =
    download.totalBytes > 0
      ? Math.min(
          100,
          Math.round(
            (download.bytesDownloaded / download.totalBytes) * 100,
          ),
        )
      : null;
  const installPercent =
    download.importProgress && download.importProgress.total > 1
      ? Math.min(
          100,
          Math.round(
            (download.importProgress.current /
              download.importProgress.total) *
              100,
          ),
        )
      : null;
  const percent = installing ? installPercent : downloadPercent;
  const indeterminate =
    !failed && (percent === null || download.phase === "checking");

  const title = failed
    ? t("packs.chineseNotAdded")
    : installing
      ? t("common.preparingDictionary")
      : paused
        ? t("packs.chinesePaused")
        : download.phase === "checking"
          ? t("packs.gettingChineseReady")
          : waiting
            ? t("common.waitingForWifi")
            : t("packs.chineseDictionary");

  return (
    <div
      className={`download-banner ${failed ? "download-banner-error" : ""}`}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {title}
      </p>
      <div className="shell download-banner-inner">
        <button
          type="button"
          className="download-banner-copy"
          onClick={onOpenDownloads}
          aria-label={t("a11y.openDownloads")}
        >
          <span className="download-banner-title">
            {(installing || download.phase === "checking") && (
              <Loader2
                size={15}
                className="spin"
                aria-hidden="true"
              />
            )}
            {title}
          </span>
          {percent !== null && !failed && (
            <span className="download-banner-percent">{percent}%</span>
          )}
          <ChevronRight size={16} aria-hidden="true" />
        </button>

        {!failed && (
          <div
            className={`progress-track download-banner-track ${
              indeterminate ? "progress-indeterminate" : ""
            }`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? undefined}
            aria-valuetext={
              percent !== null
                ? t("common.downloadingDictionary") + ` ${percent}%`
                : title
            }
            aria-label={t("a11y.chineseDownloadProgress")}
          >
            <div
              className="progress-fill"
              style={percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
        )}

        <div className="download-banner-actions">
          {failed ? (
            <>
              <button
                type="button"
                className="button button-primary button-small"
                onClick={download.retry}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {t("common.retry")}
              </button>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.cancel}
                aria-label={t("a11y.dismissChineseDownload")}
                title={t("a11y.dismiss")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </>
          ) : installing ? null : paused ? (
            <>
              <button
                type="button"
                className="button button-primary button-small download-icon-button"
                onClick={download.resume}
                aria-label={t("a11y.continueChineseDownload")}
                title={t("common.resume")}
              >
                <Play size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.cancel}
                aria-label={t("a11y.cancelChineseDownload")}
                title={t("common.cancel")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.pause}
                disabled={download.phase === "checking"}
                aria-label={t("a11y.pauseChineseDownload")}
                title={t("common.pause")}
              >
                <Pause size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.cancel}
                aria-label={t("a11y.cancelChineseDownload")}
                title={t("common.cancel")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
