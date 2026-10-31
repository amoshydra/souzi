import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileArchive,
  FileText,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import type {
  DictionaryMeta,
  ImportProgress,
} from "../types";
import { formatCount, formatDate } from "../lib/format";
import { startCedictImport } from "../lib/cedict-import";
import { AppError, translateError, type AppError as AppErrorType } from "../i18n/errors";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const CEDICT_DIRECT =
  "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";
const CEDICT_PAGE = "https://www.mdbg.net/chinese/dictionary?page=cc-cedict";

type Status = "idle" | "confirm" | "importing" | "done" | "error";

export function ImportView({
  meta,
  onImported,
  onDone,
  onBack,
  onToast,
}: {
  meta: DictionaryMeta | null;
  onImported: (count: number) => void;
  onDone: () => void;
  onBack: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const { t } = useTranslation();
  useDocumentTitle(t("import.title"));
  const [status, setStatus] = useState<Status>("idle");
  const [dragging, setDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<AppErrorType | null>(null);
  const [installedCount, setInstalledCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const phaseLabel = (phase: ImportProgress["phase"]): string => {
    switch (phase) {
      case "read":
        return t("import.phaseRead");
      case "decompress":
        return t("import.phaseDecompress");
      case "parse":
      case "index":
        return t("import.phaseParse");
      case "store":
        return t("import.phaseStore");
      case "done":
        return t("import.phaseDone");
      default:
        return t("import.phaseDefault");
    }
  };

  const progressDetail = (next: ImportProgress): string | null => {
    if (next.total <= 1) return null;
    if (next.phase === "parse") {
      return t("import.parsingProgress", {
        current: formatCount(next.current),
        total: formatCount(next.total),
      });
    }
    if (next.phase === "store") {
      return t("import.savingProgress", {
        current: formatCount(next.current),
        total: formatCount(next.total),
      });
    }
    return null;
  };

  useEffect(() => {
    if (status !== "importing") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (status === "confirm" && pendingFile) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [status, pendingFile]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const startImport = (file: File) => {
    setStatus("importing");
    setError(null);
    setInstalledCount(null);
    setProgress({
      phase: "read",
      current: 0,
      total: 1,
    });

    workerRef.current = startCedictImport(file, {
      onProgress: setProgress,
      onDone: (count) => {
        workerRef.current = null;
        setInstalledCount(count);
        setStatus("done");
        onImported(count);
        onToast(t("import.installedToast"));
      },
      onError: (importError) => {
        workerRef.current = null;
        setError(importError);
        setStatus("error");
      },
    });
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|gz|zip)$/i.test(file.name)) {
      setError(new AppError("errors.importFileType"));
      setStatus("error");
      return;
    }

    if (meta?.kind === "cedict") {
      setPendingFile(file);
      setStatus("confirm");
      return;
    }

    startImport(file);
  };

  const percent =
    progress && progress.total > 1
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  return (
    <div className="page import-page">
      <button
        type="button"
        className="back-button"
        onClick={onBack}
        disabled={status === "importing"}
      >
        <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
      </button>

      <header className="page-heading">
        <div className="section-kicker">{t("import.kicker")}</div>
        <h1>{t("import.title")}</h1>
        <p>{t("import.body")}</p>
      </header>

      {meta && status !== "done" && (
        <div className={`current-data ${meta.kind === "cedict" ? "current-data-full" : ""}`}>
          <div className="current-data-icon">
            <FileText size={18} aria-hidden="true" />
          </div>
          <div>
            <strong>
              {meta.kind === "cedict"
                ? t("import.fullInstalled")
                : t("import.starterActive")}
            </strong>
            <span>
              {t("import.wordCount", { count: meta.count })}
              {meta.kind === "cedict"
                ? t("import.importedOn", {
                    date: formatDate(meta.importedAt),
                  })
                : t("import.sampleContent")}
            </span>
          </div>
        </div>
      )}

      {status === "done" && (
        <section className="import-success">
          <div className="success-mark">
            <CheckCircle2 size={30} aria-hidden="true" />
          </div>
          <h2>{t("import.successTitle")}</h2>
          <p>
            {t("import.successBody", {
              count: installedCount ?? 0,
            })}
          </p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={onDone}>
              {t("import.openDictionary")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setStatus("idle");
                setProgress(null);
                setInstalledCount(null);
                inputRef.current?.click();
              }}
            >
              {t("import.importAnother")}
            </button>
          </div>
        </section>
      )}

      {status !== "done" && (
        <div className="import-grid">
          <section className="step-card">
            <div className="step-number" aria-hidden="true">1</div>
            <h2>{t("import.step1Title")}</h2>
            <p>{t("import.step1Body")}</p>
            <a
              className="button button-primary"
              href={CEDICT_DIRECT}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={16} aria-hidden="true" />
              {t("import.downloadDictionary")}
            </a>
            <a
              className="text-link"
              href={CEDICT_PAGE}
              target="_blank"
              rel="noreferrer"
            >
              {t("import.openDownloadPage")}
            </a>
            <div className="license-note">{t("import.licenseNote")}</div>
          </section>

          <section className="step-card step-card-import">
            <div className="step-number" aria-hidden="true">2</div>
            <h2>{t("import.step2Title")}</h2>
            <p>{t("import.step2Body")}</p>

            <div
              className={`dropzone ${dragging ? "dropzone-active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                acceptFile(event.dataTransfer.files[0]);
              }}
            >
              <div className="dropzone-icon">
                <UploadCloud size={26} aria-hidden="true" />
              </div>
              <strong>{t("import.dropHere")}</strong>
              <span>{t("import.or")}</span>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => inputRef.current?.click()}
              >
                {t("import.chooseFile")}
              </button>
              <span className="dropzone-hint">{t("import.fileTypes")}</span>
            </div>

            <input
              ref={inputRef}
              id="import-cedict-file"
              name="cedict-file"
              type="file"
              accept=".txt,.gz,.zip,application/gzip,text/plain"
              hidden
              onChange={(event) => {
                acceptFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <div className="privacy-note">
              <ShieldCheck size={16} aria-hidden="true" />
              {t("import.privacy")}
            </div>
          </section>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="modal modal-dialog"
        aria-labelledby="replace-title"
        aria-describedby="replace-body"
        onCancel={(event) => {
          event.preventDefault();
          dialogRef.current?.close();
        }}
        onClose={() => {
          if (status === "confirm") {
            setStatus("idle");
            setPendingFile(null);
          }
        }}
      >
        {status === "confirm" && pendingFile ? (
          <>
            <button
              type="button"
              className="modal-close"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("common.close")}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div className="modal-icon">
              <FileArchive size={24} aria-hidden="true" />
            </div>
            <h2 id="replace-title">{t("import.replaceTitle")}</h2>
            <p id="replace-body">
              {t("import.replaceBody", { fileName: pendingFile.name })}
            </p>
            <div className="button-row">
              <button
                type="button"
                className="button button-primary"
                autoFocus
                onClick={() => {
                  const file = pendingFile;
                  setPendingFile(null);
                  startImport(file);
                }}
              >
                {t("import.replace")}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => dialogRef.current?.close()}
              >
                {t("common.cancel")}
              </button>
            </div>
          </>
        ) : null}
      </dialog>

      {status === "importing" && progress && (
        <section className="import-progress">
          <div className="progress-head">
            <div>
              <div className="section-kicker">{t("import.installing")}</div>
              <h2>{phaseLabel(progress.phase)}</h2>
            </div>
            {percent !== null ? (
              <span className="progress-percent">{percent}%</span>
            ) : (
              <Loader2 className="spin" size={20} aria-hidden="true" />
            )}
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
            aria-label={t("a11y.dictionaryImportProgress")}
          >
            <div
              className="progress-fill"
              style={percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
          {progressDetail(progress) && (
            <p className="progress-message">{progressDetail(progress)}</p>
          )}
          <p className="progress-note">{t("import.keepOpen")}</p>
        </section>
      )}

      {status === "error" && (
        <section className="import-error">
          <div className="error-icon">
            <AlertCircle size={22} aria-hidden="true" />
          </div>
          <div>
            <div role="alert">
              <h2>{t("import.importFailed")}</h2>
              <p>{error ? translateError(t, error) : t("import.failed")}</p>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                  inputRef.current?.click();
                }}
              >
                {t("import.chooseAnother")}
              </button>
              <a
                className="button button-ghost"
                href={CEDICT_DIRECT}
                target="_blank"
                rel="noreferrer"
              >
                {t("import.downloadAgain")}
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="import-faq">
        <h2>{t("import.faqTitle")}</h2>
        <p>{t("import.faqBody1")}</p>
        <p>{t("import.faqBody2")}</p>
      </section>
    </div>
  );
}
