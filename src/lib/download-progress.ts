import type { NativeCedictDownload } from "../hooks/useNativeCedictDownload";

export function getDownloadPercent(
  download: NativeCedictDownload,
): number | null {
  if (download.totalBytes <= 0) return null;
  return Math.min(
    100,
    Math.round((download.bytesDownloaded / download.totalBytes) * 100),
  );
}

export function getInstallPercent(
  download: NativeCedictDownload,
): number | null {
  const progress = download.importProgress;
  if (!progress || progress.total <= 1) return null;
  return Math.min(
    100,
    Math.round((progress.current / progress.total) * 100),
  );
}

export function getActivePercent(
  download: NativeCedictDownload,
): number | null {
  return download.phase === "installing"
    ? getInstallPercent(download)
    : getDownloadPercent(download);
}
