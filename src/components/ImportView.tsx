import { useEffect, useRef, useState } from "react";
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
  ImportWorkerMessage,
} from "../types";
import { formatCount, formatDate } from "../lib/format";

const CEDICT_DIRECT =
  "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";
const CEDICT_PAGE = "https://www.mdbg.net/chinese/dictionary?page=cc-cedict";

type Status = "idle" | "confirm" | "importing" | "done" | "error";

function phaseLabel(phase: ImportProgress["phase"]): string {
  switch (phase) {
    case "read":
      return "Reading file";
    case "decompress":
      return "Decompressing";
    case "parse":
      return "Preparing words";
    case "index":
      return "Preparing words";
    case "store":
      return "Saving dictionary";
    case "done":
      return "Installed";
    default:
      return "Working";
  }
}

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
  const [status, setStatus] = useState<Status>("idle");
  const [dragging, setDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState("");
  const [installedCount, setInstalledCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (status !== "importing") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  const startImport = (file: File) => {
    setStatus("importing");
    setError("");
    setInstalledCount(null);
    setProgress({
      phase: "read",
      current: 0,
      total: 1,
      message: "Reading file…",
    });

    const worker = new Worker(
      new URL("../workers/import.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<ImportWorkerMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        setProgress(message.progress);
        return;
      }

      if (message.type === "done") {
        worker.terminate();
        workerRef.current = null;
        setInstalledCount(message.count);
        setStatus("done");
        onImported(message.count);
        onToast("Dictionary installed");
        return;
      }

      if (message.type === "error") {
        worker.terminate();
        workerRef.current = null;
        setError(message.message);
        setStatus("error");
      }
    };

    worker.onerror = (event) => {
      worker.terminate();
      workerRef.current = null;
      setError(event.message || "The import worker crashed.");
      setStatus("error");
    };

    file
      .arrayBuffer()
      .then((buffer) => {
        worker.postMessage({ buffer, fileName: file.name }, [buffer]);
      })
      .catch((reason: unknown) => {
        worker.terminate();
        workerRef.current = null;
        setError(
          reason instanceof Error ? reason.message : "Could not read that file.",
        );
        setStatus("error");
      });
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|gz|zip)$/i.test(file.name)) {
      setError("Choose a .txt, .gz, or .zip file.");
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
        <ArrowLeft size={18} /> Back
      </button>

      <header className="page-heading">
        <div className="section-kicker">Chinese dictionary</div>
        <h1>Add the Chinese dictionary</h1>
        <p>
          English to Chinese is already included. This adds Chinese words and
          their English meanings. Download the free dictionary, then choose the
          file here. It stays on this device.
        </p>
      </header>

      {meta && status !== "done" && (
        <div className={`current-data ${meta.kind === "cedict" ? "current-data-full" : ""}`}>
          <div className="current-data-icon">
            <FileText size={18} />
          </div>
          <div>
            <strong>
              {meta.kind === "cedict" ? "Full dictionary installed" : "Starter set active"}
            </strong>
            <span>
              {formatCount(meta.count)} words
              {meta.kind === "cedict" ? ` · ${formatDate(meta.importedAt)}` : " · sample content"}
            </span>
          </div>
        </div>
      )}

      {status === "done" && (
        <section className="import-success">
          <div className="success-mark">
            <CheckCircle2 size={30} />
          </div>
          <h2>Dictionary installed</h2>
          <p>
            {formatCount(installedCount ?? 0)} words are now available offline
            on this device.
          </p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={onDone}>
              Open dictionary
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
              Import another file
            </button>
          </div>
        </section>
      )}

      {status !== "done" && (
        <div className="import-grid">
          <section className="step-card">
            <div className="step-number">1</div>
            <h2>Download the dictionary</h2>
            <p>
              The free Chinese dictionary. About 4 MB. It stays on your device.
            </p>
            <a
              className="button button-primary"
              href={CEDICT_DIRECT}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={16} />
              Download dictionary
            </a>
            <a
              className="text-link"
              href={CEDICT_PAGE}
              target="_blank"
              rel="noreferrer"
            >
              Open the download page
            </a>
            <div className="license-note">
              Free dictionary data. See About for credits.
            </div>
          </section>

          <section className="step-card step-card-import">
            <div className="step-number">2</div>
            <h2>Choose the file</h2>
            <p>
              Choose the file you downloaded.
            </p>

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
                <UploadCloud size={26} />
              </div>
              <strong>Drop the file here</strong>
              <span>or</span>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => inputRef.current?.click()}
              >
                Choose file
              </button>
              <span className="dropzone-hint">.txt.gz · .txt · .zip</span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".txt,.gz,.zip,application/gzip,text/plain"
              className="sr-only"
              onChange={(event) => {
                acceptFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <div className="privacy-note">
              <ShieldCheck size={16} />
              Saved on this device. Nothing is sent anywhere.
            </div>
          </section>
        </div>
      )}

      {status === "confirm" && pendingFile && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setStatus("idle");
                setPendingFile(null);
              }}
              aria-label="Cancel"
            >
              <X size={18} />
            </button>
            <div className="modal-icon">
              <FileArchive size={24} />
            </div>
            <h2 id="replace-title">Replace the current dictionary?</h2>
            <p>
              <strong>{pendingFile.name}</strong> will replace the installed
              dictionary. Saved words and history are kept.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  const file = pendingFile;
                  setPendingFile(null);
                  startImport(file);
                }}
              >
                Replace dictionary
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setStatus("idle");
                  setPendingFile(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "importing" && progress && (
        <section className="import-progress">
          <div className="progress-head">
            <div>
              <div className="section-kicker">Installing</div>
              <h2>{phaseLabel(progress.phase)}</h2>
            </div>
            {percent !== null ? (
              <span className="progress-percent">{percent}%</span>
            ) : (
              <Loader2 className="spin" size={20} />
            )}
          </div>
          <div
            className={`progress-track ${percent === null ? "progress-indeterminate" : ""}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? undefined}
            aria-label="Dictionary import progress"
          >
            <div
              className="progress-fill"
              style={percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
          <p className="progress-message">{progress.message}</p>
          <p className="progress-note">
            Keep this tab open until the import finishes. It usually takes a few
            seconds.
          </p>
        </section>
      )}

      {status === "error" && (
        <section className="import-error" role="alert">
          <div className="error-icon">
            <AlertCircle size={22} />
          </div>
          <div>
            <h2>Import failed</h2>
            <p>{error}</p>
            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setStatus("idle");
                  setError("");
                  inputRef.current?.click();
                }}
              >
                Choose another file
              </button>
              <a
                className="button button-ghost"
                href={CEDICT_DIRECT}
                target="_blank"
                rel="noreferrer"
              >
                Download again
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="import-faq">
        <h2>Why is this a separate download?</h2>
        <p>
          The Chinese dictionary is large. Downloading it separately keeps the
          app small and keeps the data on your device.
        </p>
        <p>
          The file is prepared on this device and saved for offline use. It is
          never sent to a server.
        </p>
      </section>
    </div>
  );
}
