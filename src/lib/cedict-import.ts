import type { ImportProgress, ImportWorkerMessage } from "../types";
import { AppError, asAppError } from "../i18n/errors";

export type CedictImportHandlers = {
  onProgress?: (progress: ImportProgress) => void;
  onDone: (count: number) => void;
  onError: (error: AppError) => void;
};

function createWorker(handlers: CedictImportHandlers): {
  worker: Worker;
  fail: (error: AppError) => void;
  settled: () => boolean;
} {
  const worker = new Worker(
    new URL("../workers/import.worker.ts", import.meta.url),
    { type: "module" },
  );
  let isSettled = false;

  const fail = (error: AppError) => {
    if (isSettled) return;
    isSettled = true;
    worker.terminate();
    handlers.onError(error);
  };

  worker.onmessage = (event: MessageEvent<ImportWorkerMessage>) => {
    const message = event.data;

    if (message.type === "progress") {
      handlers.onProgress?.(message.progress);
      return;
    }

    if (message.type === "done") {
      if (isSettled) return;
      isSettled = true;
      worker.terminate();
      handlers.onDone(message.count);
      return;
    }

    if (message.type === "error") {
      fail(new AppError(message.code, message.params));
    }
  };

  worker.onerror = (event) => {
    fail(asAppError(event.error, "errors.importWorker"));
  };

  return { worker, fail, settled: () => isSettled };
}

export function startCedictImportFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  handlers: CedictImportHandlers,
): Worker {
  const { worker, fail, settled } = createWorker(handlers);
  if (!settled()) {
    worker.postMessage({ buffer, fileName }, [buffer]);
  }
  return worker;
}

export function startCedictImport(
  file: File,
  handlers: CedictImportHandlers,
): Worker {
  const { worker, fail, settled } = createWorker(handlers);

  file
    .arrayBuffer()
    .then((buffer) => {
      if (settled()) return;
      worker.postMessage({ buffer, fileName: file.name }, [buffer]);
    })
    .catch((reason: unknown) => {
      fail(asAppError(reason, "errors.importRead"));
    });

  return worker;
}
