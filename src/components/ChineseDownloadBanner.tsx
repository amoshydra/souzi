import { Loader2, Pause, Play, RefreshCw, X } from "lucide-react";
import type { NativeCedictDownload } from "../hooks/useNativeCedictDownload";

export function ChineseDownloadBanner({
  download,
}: {
  download: NativeCedictDownload;
}) {
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
    ? "Chinese dictionary not added."
    : installing
      ? "Preparing Chinese dictionary…"
      : paused
        ? "Chinese dictionary paused."
        : download.phase === "checking"
          ? "Getting Chinese dictionary ready…"
          : waiting
            ? "Waiting for Wi-Fi…"
            : "Chinese dictionary";

  return (
    <div
      className={`download-banner ${failed ? "download-banner-error" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="shell download-banner-inner">
        <div className="download-banner-copy">
          <span className="download-banner-title">
            {(installing || download.phase === "checking") && (
              <Loader2 size={15} className="spin" aria-hidden="true" />
            )}
            {title}
          </span>
          {percent !== null && !failed && (
            <span className="download-banner-percent">{percent}%</span>
          )}
        </div>

        {!failed && (
          <div
            className={`progress-track download-banner-track ${
              indeterminate ? "progress-indeterminate" : ""
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
        )}

        <div className="download-banner-actions">
          {failed ? (
            <>
              <button
                type="button"
                className="button button-primary button-small"
                onClick={download.retry}
              >
                <RefreshCw size={15} />
                Try again
              </button>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.cancel}
                aria-label="Dismiss Chinese dictionary download"
                title="Dismiss"
              >
                <X size={17} />
              </button>
            </>
          ) : installing ? null : paused ? (
            <>
              <button
                type="button"
                className="button button-primary button-small download-icon-button"
                onClick={download.resume}
                aria-label="Continue Chinese dictionary download"
                title="Continue"
              >
                <Play size={17} />
              </button>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.cancel}
                aria-label="Cancel Chinese dictionary download"
                title="Cancel"
              >
                <X size={17} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.pause}
                disabled={download.phase === "checking"}
                aria-label="Pause Chinese dictionary download"
                title="Pause"
              >
                <Pause size={17} />
              </button>
              <button
                type="button"
                className="button button-secondary button-small download-icon-button"
                onClick={download.cancel}
                aria-label="Cancel Chinese dictionary download"
                title="Cancel"
              >
                <X size={17} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
