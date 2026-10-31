import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Wifi,
  X,
} from "lucide-react";
import type { NativeCedictDownload } from "../hooks/useNativeCedictDownload";
import type { FullEnglishDownload } from "../hooks/useFullEnglishDownload";
import type { ExamplePackState } from "../hooks/useExamplePack";
import type { RelatedPackState } from "../hooks/useRelatedPack";
import { getActivePercent } from "../lib/download-progress";
import { formatBytes, formatCount } from "../lib/format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { translateError, type AppError } from "../i18n/errors";
import type {
  DictionaryMeta,
  EnglishCoreStatus,
  FullEnglishMeta,
} from "../types";

export function DownloadsView({
  chineseMeta,
  englishStatus,
  download,
  fullEnglishMeta,
  fullDownload,
  examplePack,
  relatedPack,
  onRemoveFullEnglish,
  onBack,
  onInstallEnglish,
  onImport,
  onOpenInstall,
}: {
  chineseMeta: DictionaryMeta | null;
  englishStatus: EnglishCoreStatus;
  download: NativeCedictDownload;
  fullEnglishMeta: FullEnglishMeta | null;
  fullDownload: FullEnglishDownload;
  examplePack: ExamplePackState;
  relatedPack: RelatedPackState;
  onRemoveFullEnglish: () => void;
  onBack: () => void;
  onInstallEnglish: () => void;
  onImport: () => void;
  onOpenInstall: () => void;
}) {
  const { t } = useTranslation();
  useDocumentTitle(t("packs.title"));
  const native = Capacitor.isNativePlatform();
  const chineseReady = chineseMeta?.kind === "cedict";
  const percent = getActivePercent(download);
  const waitingForWifi =
    download.downloadStatus === "waiting" ||
    (download.downloadStatus === "pending" && download.wifiOnly);
  const fullPercent = getActivePercent(fullDownload);
  const fullWaitingForWifi =
    fullDownload.downloadStatus === "waiting" ||
    (fullDownload.downloadStatus === "pending" && fullDownload.wifiOnly);
  const examplePercent =
    examplePack.progress?.total && examplePack.progress.total > 0
      ? Math.min(
          100,
          Math.round(
            (examplePack.progress.loaded / examplePack.progress.total) * 100,
          ),
        )
      : null;
  const relatedPercent =
    relatedPack.progress?.total && relatedPack.progress.total > 0
      ? Math.min(
          100,
          Math.round(
            (relatedPack.progress.loaded / relatedPack.progress.total) * 100,
          ),
        )
      : null;
  const examplePhaseLabel =
    examplePack.phase === "checking"
      ? t("packs.checkingPack")
      : examplePack.phase === "installing"
        ? t("packs.installingExamples")
        : t("packs.downloadingExamples");
  const relatedPhaseLabel =
    relatedPack.phase === "checking"
      ? t("packs.checkingPack")
      : relatedPack.phase === "installing"
        ? t("packs.installingRelated")
        : t("packs.downloadingRelated");

  const errorText = (error: AppError | null): string =>
    error ? translateError(t, error) : "";

  const chineseStatus = chineseReady
    ? t("common.ready")
    : download.phase === "error"
      ? t("common.stopped")
      : download.phase === "paused"
        ? t("common.paused")
        : download.phase === "installing"
          ? t("common.preparing")
          : download.phase === "checking" ||
              download.phase === "downloading" ||
              download.phase === "done"
            ? t("common.downloading")
            : t("common.notAdded");
  const fullPhaseLabel =
    fullDownload.phase === "installing"
      ? t("common.preparingDictionary")
      : fullDownload.phase === "checking"
        ? t("common.startingDownload")
        : fullDownload.phase === "paused"
          ? t("common.paused")
          : fullWaitingForWifi
            ? t("common.waitingForWifi")
            : fullDownload.phase === "done"
              ? t("common.downloadComplete")
              : t("common.downloadingDictionary");
  const chinesePhaseLabel =
    download.phase === "installing"
      ? t("common.preparingDictionary")
      : download.phase === "checking"
        ? t("common.startingDownload")
        : download.phase === "paused"
          ? t("common.paused")
          : waitingForWifi
            ? t("common.waitingForWifi")
            : download.phase === "done"
              ? t("common.downloadComplete")
              : t("common.downloadingDictionary");

  const totalPacks = 5;
  const installedCount = [
    englishStatus === "ready",
    Boolean(fullEnglishMeta),
    chineseReady,
    Boolean(examplePack.meta),
    Boolean(relatedPack.meta),
  ].filter(Boolean).length;
  const updateCount = [
    examplePack.remoteVersion !== null &&
      examplePack.meta !== null &&
      examplePack.remoteVersion > examplePack.meta.version,
    relatedPack.remoteVersion !== null &&
      relatedPack.meta !== null &&
      relatedPack.remoteVersion > relatedPack.meta.version,
  ].filter(Boolean).length;
  const storageBytes =
    (fullEnglishMeta?.size ?? 0) +
    (examplePack.meta?.bytes ?? 0) +
    (relatedPack.meta?.bytes ?? 0);
  const storageLabel = formatBytes(storageBytes);

  return (
    <div className="page downloads-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
      </button>

      <header className="page-heading">
        <div className="section-kicker">{t("packs.kicker")}</div>
        <h1>{t("packs.title")}</h1>
        <p>{t("packs.subtitle")}</p>
      </header>

      <section className="pack-summary" aria-label={t("packs.summary")}>
        <div className="pack-summary-stat">
          <span className="pack-summary-value">
            {installedCount}/{totalPacks}
          </span>
          <span className="pack-summary-label">{t("packs.installed")}</span>
        </div>
        <div className="pack-summary-stat">
          <span className="pack-summary-value">{storageLabel}</span>
          <span className="pack-summary-label">
            {t("packs.optionalStorage")}
          </span>
        </div>
        <div className="pack-summary-stat">
          <span className="pack-summary-value">
            {updateCount > 0 ? updateCount : "—"}
          </span>
          <span className="pack-summary-label">
            {updateCount > 0
              ? t("packs.updatesReady")
              : t("packs.upToDate")}
          </span>
        </div>
      </section>

      <div className="pack-section-head">
        <h2>{t("packs.dictionaries")}</h2>
        <p>{t("packs.dictionariesBody")}</p>
      </div>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>{t("packs.englishDictionary")}</h2>
            <p>{t("packs.includedWithSouzi")}</p>
          </div>
          {englishStatus === "ready" ? (
            <span className="status-pill status-good">{t("common.ready")}</span>
          ) : (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={onInstallEnglish}
              disabled={englishStatus === "loading"}
            >
              {englishStatus === "loading" ? (
                <Loader2 size={15} className="spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={15} aria-hidden="true" />
              )}
              {englishStatus === "loading"
                ? t("common.preparing")
                : t("common.retry")}
            </button>
          )}
        </div>
      </section>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>{t("packs.fullEnglishDictionary")}</h2>
            <p>{t("packs.fullEnglishWords")}</p>
          </div>
          <span
            className={`status-pill ${
              fullEnglishMeta ? "status-good" : "status-muted"
            }`}
          >
            {fullEnglishMeta
              ? t("common.ready")
              : fullDownload.phase === "error"
                ? t("common.stopped")
                : fullDownload.phase === "installing"
                  ? t("common.preparing")
                  : fullDownload.phase === "paused"
                    ? t("common.paused")
                    : fullDownload.phase === "checking" ||
                        fullDownload.phase === "downloading"
                      ? t("common.downloading")
                      : t("common.optional")}
          </span>
        </div>

        {fullEnglishMeta ? (
          <div className="download-card-body">
            <p className="download-ready">
              <CheckCircle2 size={17} aria-hidden="true" />
              {t("packs.downloadedAndReady")}
            </p>
            <div className="download-actions">
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={onRemoveFullEnglish}
              >
                <X size={15} aria-hidden="true" />
                {t("common.remove")}
              </button>
            </div>
          </div>
        ) : native ? (
          <div className="download-card-body">
            {fullDownload.phase === "idle" ? (
              <>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void fullDownload.start()}
                >
                  {t("common.download")}
                </button>
                {fullDownload.error && (
                  <p className="download-state download-error" role="alert">
                    {errorText(fullDownload.error)}
                  </p>
                )}
              </>
            ) : fullDownload.phase === "error" ? (
              <>
                <p className="download-state">{t("packs.downloadStopped")}</p>
                <p className="download-state download-error" role="alert">
                  {errorText(fullDownload.error)}
                </p>
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => void fullDownload.retry()}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    {t("common.retry")}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void fullDownload.cancel()}
                  >
                    <X size={15} aria-hidden="true" />
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="download-progress-head">
                  <span>{fullPhaseLabel}</span>
                  {fullPercent !== null && <span>{fullPercent}%</span>}
                </div>
                <div
                  className={`progress-track ${
                    fullPercent === null ||
                    fullDownload.phase === "checking"
                      ? "progress-indeterminate"
                      : ""
                  }`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={fullPercent ?? undefined}
                  aria-valuetext={
                    fullPercent !== null
                      ? `${fullPhaseLabel} ${fullPercent}%`
                      : fullPhaseLabel
                  }
                  aria-label={t("a11y.fullEnglishDownloadProgress")}
                >
                  <div
                    className="progress-fill"
                    style={
                      fullPercent !== null
                        ? { width: `${fullPercent}%` }
                        : undefined
                    }
                  />
                </div>

                {fullDownload.phase !== "installing" && (
                  <div className="download-actions">
                    {fullDownload.phase === "paused" ? (
                      <button
                        type="button"
                        className="button button-primary button-small"
                        onClick={() => void fullDownload.resume()}
                      >
                        <Play size={15} aria-hidden="true" />
                        {t("common.continue")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => void fullDownload.pause()}
                        disabled={fullDownload.phase === "checking"}
                      >
                        <Pause size={15} aria-hidden="true" />
                        {t("common.pause")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => void fullDownload.cancel()}
                    >
                      <X size={15} aria-hidden="true" />
                      {t("common.cancel")}
                    </button>
                  </div>
                )}

                <label className="setup-wifi-toggle">
                  <input
                    id="full-english-wifi"
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
              </>
            )}
          </div>
        ) : (
          <div className="download-card-body">
            {native ? (
              <p className="download-state">
                {t("packs.fullAvailableAndroid")}
              </p>
            ) : (
              <button
                type="button"
                className="download-install-notice"
                onClick={onOpenInstall}
              >
                <span>
                  {t("packs.fullAvailableAndroid")}
                  <span className="download-install-cta">
                    {t("packs.howToInstall")}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>{t("packs.chineseDictionary")}</h2>
            <p>{t("packs.chineseToEnglish")}</p>
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
            <CheckCircle2 size={17} aria-hidden="true" />
            {t("packs.downloadedAndReady")}
          </p>
        ) : native ? (
          <div className="download-card-body">
            {download.phase === "idle" ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => void download.start()}
              >
                {t("common.download")}
              </button>
            ) : download.phase === "error" ? (
              <>
                <p className="download-state">{t("packs.downloadStopped")}</p>
                <p className="download-state download-error" role="alert">
                  {errorText(download.error)}
                </p>
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => void download.retry()}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    {t("common.retry")}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void download.cancel()}
                  >
                    <X size={15} aria-hidden="true" />
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="download-progress-head">
                  <span>{chinesePhaseLabel}</span>
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
                  aria-valuetext={
                    percent !== null
                      ? `${chinesePhaseLabel} ${percent}%`
                      : chinesePhaseLabel
                  }
                  aria-label={t("a11y.chineseDownloadProgress")}
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
                        <Play size={15} aria-hidden="true" />
                        {t("common.continue")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => void download.pause()}
                        disabled={download.phase === "checking"}
                      >
                        <Pause size={15} aria-hidden="true" />
                        {t("common.pause")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => void download.cancel()}
                    >
                      <X size={15} aria-hidden="true" />
                      {t("common.cancel")}
                    </button>
                  </div>
                )}
              </>
            )}

            <label className="setup-wifi-toggle">
              <input
                id="chinese-wifi"
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
          <div className="download-card-body">
            <p className="download-state">{t("packs.chooseFile")}</p>
            <button
              type="button"
              className="button button-primary"
              onClick={onImport}
            >
              <Plus size={16} aria-hidden="true" />
              {t("packs.addDictionary")}
            </button>
          </div>
        )}
      </section>

      <div className="pack-section-head">
        <h2>{t("packs.contentPacks")}</h2>
        <p>{t("packs.contentPacksBody")}</p>
      </div>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>{t("packs.exampleSentences")}</h2>
            <p>{t("packs.exampleSource")}</p>
          </div>
          <span
            className={`status-pill ${
              examplePack.meta ? "status-good" : "status-muted"
            }`}
          >
            {examplePack.meta
              ? t("common.statusReady")
              : t("common.statusOptional")}
          </span>
        </div>

        <div className="download-card-body">
          {examplePack.meta ? (
            <>
              <p className="download-state">
                {t("packs.examplesInstalled", {
                  count: examplePack.meta.entries,
                  version: examplePack.meta.version,
                })}
              </p>
              <p className="download-source">
                {t("packs.attribution", {
                  source: "Tatoeba",
                  license: examplePack.meta.license,
                })}
              </p>
              <div className="download-actions">
                {examplePack.remoteVersion !== null &&
                  examplePack.remoteVersion > examplePack.meta.version && (
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={() => void examplePack.install()}
                    >
                      <RefreshCw size={15} aria-hidden="true" />
                      {t("common.updateTo", {
                        version: examplePack.remoteVersion,
                      })}
                    </button>
                  )}
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => void examplePack.remove()}
                >
                  {t("common.remove")}
                </button>
              </div>
            </>
          ) : examplePack.phase === "loading" ? (
            <p className="download-state">{t("packs.checkExamples")}</p>
          ) : examplePack.phase === "error" ? (
            <>
              <p className="download-state download-error" role="alert">
                {errorText(examplePack.error)}
              </p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void examplePack.install()}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  {t("common.retry")}
                </button>
              </div>
            </>
          ) : examplePack.phase === "checking" ||
            examplePack.phase === "downloading" ||
            examplePack.phase === "installing" ? (
            <>
              <div className="setup-progress">
                <div className="setup-progress-head">
                  <span>{examplePhaseLabel}</span>
                  {examplePercent !== null && <span>{examplePercent}%</span>}
                </div>
                <div
                  className={`progress-track ${
                    examplePercent === null ? "progress-indeterminate" : ""
                  }`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={examplePercent ?? undefined}
                  aria-valuetext={
                    examplePercent !== null
                      ? `${examplePhaseLabel} ${examplePercent}%`
                      : examplePhaseLabel
                  }
                  aria-label={t("a11y.exampleDownloadProgress")}
                >
                  <div
                    className="progress-fill"
                    style={
                      examplePercent !== null
                        ? { width: `${examplePercent}%` }
                        : undefined
                    }
                  />
                </div>
              </div>
              {examplePack.phase !== "installing" && (
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={examplePack.cancel}
                  >
                    <X size={15} aria-hidden="true" />
                    {t("common.cancel")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="download-state">{t("packs.addExamples")}</p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void examplePack.install()}
                >
                  <Plus size={15} aria-hidden="true" />
                  {t("common.install")}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="settings-card download-card">
        <div className="download-card-head">
          <div>
            <h2>{t("packs.relatedWords")}</h2>
            <p>{t("packs.relatedSource")}</p>
          </div>
          <span
            className={`status-pill ${
              relatedPack.meta ? "status-good" : "status-muted"
            }`}
          >
            {relatedPack.meta
              ? t("common.statusReady")
              : t("common.statusOptional")}
          </span>
        </div>

        <div className="download-card-body">
          {relatedPack.meta ? (
            <>
              <p className="download-state">
                {t("packs.relationsInstalled", {
                  count: relatedPack.meta.entries,
                  version: relatedPack.meta.version,
                })}
              </p>
              <p className="download-source">
                {t("packs.attribution", {
                  source: relatedPack.meta.source,
                  license: relatedPack.meta.license,
                })}
              </p>
              <div className="download-actions">
                {relatedPack.remoteVersion !== null &&
                  relatedPack.remoteVersion > relatedPack.meta.version && (
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={() => void relatedPack.install()}
                    >
                      <RefreshCw size={15} aria-hidden="true" />
                      {t("common.updateTo", {
                        version: relatedPack.remoteVersion,
                      })}
                    </button>
                  )}
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => void relatedPack.remove()}
                >
                  {t("common.remove")}
                </button>
              </div>
            </>
          ) : relatedPack.phase === "loading" ? (
            <p className="download-state">{t("packs.checkRelated")}</p>
          ) : relatedPack.phase === "error" ? (
            <>
              <p className="download-state download-error" role="alert">
                {errorText(relatedPack.error)}
              </p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void relatedPack.install()}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  {t("common.retry")}
                </button>
              </div>
            </>
          ) : relatedPack.phase === "checking" ||
            relatedPack.phase === "downloading" ||
            relatedPack.phase === "installing" ? (
            <>
              <div className="setup-progress">
                <div className="setup-progress-head">
                  <span>{relatedPhaseLabel}</span>
                  {relatedPercent !== null && <span>{relatedPercent}%</span>}
                </div>
                <div
                  className={`progress-track ${
                    relatedPercent === null ? "progress-indeterminate" : ""
                  }`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={relatedPercent ?? undefined}
                  aria-valuetext={
                    relatedPercent !== null
                      ? `${relatedPhaseLabel} ${relatedPercent}%`
                      : relatedPhaseLabel
                  }
                  aria-label={t("a11y.relatedDownloadProgress")}
                >
                  <div
                    className="progress-fill"
                    style={
                      relatedPercent !== null
                        ? { width: `${relatedPercent}%` }
                        : undefined
                    }
                  />
                </div>
              </div>
              {relatedPack.phase !== "installing" && (
                <div className="download-actions">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={relatedPack.cancel}
                  >
                    <X size={15} aria-hidden="true" />
                    {t("common.cancel")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="download-state">{t("packs.addRelated")}</p>
              <div className="download-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => void relatedPack.install()}
                >
                  <Plus size={15} aria-hidden="true" />
                  {t("common.install")}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <p className="download-privacy">{t("packs.privacy")}</p>
    </div>
  );
}
