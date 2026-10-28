export function getDownloadPercent(download: {
  totalBytes: number;
  bytesDownloaded: number;
}): number | null {
  if (download.totalBytes <= 0) return null;
  return Math.min(
    100,
    Math.round((download.bytesDownloaded / download.totalBytes) * 100),
  );
}

export type DownloadWithInstallProgress = {
  phase: string;
  importProgress?: { current: number; total: number } | null;
  totalBytes: number;
  bytesDownloaded: number;
};

export function getInstallPercent(
  download: DownloadWithInstallProgress,
): number | null {
  const progress = download.importProgress;
  if (!progress || progress.total <= 1) return null;
  return Math.min(
    100,
    Math.round((progress.current / progress.total) * 100),
  );
}

export function getActivePercent(
  download: DownloadWithInstallProgress,
): number | null {
  return download.phase === "installing"
    ? getInstallPercent(download)
    : getDownloadPercent(download);
}
