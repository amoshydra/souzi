import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { ImportProgress } from "../types";
import { startCedictImportFromBuffer } from "../lib/cedict-import";
import {
  NativeDictionaryDownloader,
  type NativeDownloadStatus,
} from "../lib/native-download";

const CEDICT_URL =
  "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";
const CEDICT_FILE = "cedict_1_0_ts_utf-8_mdbg.txt.gz";
const STORAGE_KEY = "souzi-cedict-download";
const WIFI_KEY = "souzi-cedict-wifi-only";

export type NativeCedictPhase =
  | "idle"
  | "checking"
  | "downloading"
  | "paused"
  | "installing"
  | "done"
  | "error";

type StoredDownload = {
  id: number;
  wifiOnly: boolean;
};

function base64ToBuffer(data: string): ArrayBuffer {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function useNativeCedictDownload({
  onInstalled,
}: {
  onInstalled: () => Promise<void> | void;
}) {
  const [phase, setPhase] = useState<NativeCedictPhase>("idle");
  const [downloadStatus, setDownloadStatus] =
    useState<NativeDownloadStatus>("pending");
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState("");
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null,
  );
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [pollEpoch, setPollEpoch] = useState(0);
  const [wifiOnly, setWifiOnlyState] = useState(() => {
    try {
      return localStorage.getItem(WIFI_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const onInstalledRef = useRef(onInstalled);
  const sampleRef = useRef({ bytes: 0, time: 0 });

  useEffect(() => {
    onInstalledRef.current = onInstalled;
  }, [onInstalled]);

  const setWifiOnly = useCallback((value: boolean) => {
    setWifiOnlyState(value);
    try {
      localStorage.setItem(WIFI_KEY, String(value));
    } catch {
      // Storage can be unavailable in private modes.
    }
  }, []);

  const clearStoredDownload = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const installDownloadedFile = useCallback(
    async (id: number) => {
      setPhase("installing");
      setSpeed(0);

      try {
        const file = await NativeDictionaryDownloader.readFile({ id });
        const buffer = base64ToBuffer(file.data);
        startCedictImportFromBuffer(buffer, file.fileName, {
          onProgress: setImportProgress,
          onDone: async () => {
            clearStoredDownload();
            setDownloadId(null);
            setImportProgress(null);
            setPhase("done");
            await onInstalledRef.current();
          },
          onError: (message) => {
            setImportProgress(null);
            setError(message);
            setPhase("error");
          },
        });
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "The downloaded dictionary could not be read. Please try again.",
        );
        setPhase("error");
      }
    },
    [clearStoredDownload],
  );

  useEffect(() => {
    if (!downloadId) return;

    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const status = await NativeDictionaryDownloader.status({
          id: downloadId,
        });
        if (cancelled) return;

        setDownloadStatus(status.status);
        const downloaded = Number(status.bytesDownloaded) || 0;
        const total = Number(status.totalBytes) || 0;
        setBytesDownloaded(downloaded);
        setTotalBytes(total);

        const now = Date.now();
        const previous = sampleRef.current;
        if (previous.time > 0 && now - previous.time >= 300) {
          const seconds = (now - previous.time) / 1000;
          const delta = downloaded - previous.bytes;
          setSpeed(delta > 0 ? delta / seconds : 0);
        }
        sampleRef.current = { bytes: downloaded, time: now };

        if (status.status === "successful") {
          setSpeed(0);
          void installDownloadedFile(downloadId);
          return;
        }

        if (status.status === "failed") {
          setSpeed(0);
          setError("The download did not finish. Please try again.");
          setPhase("error");
          return;
        }

        if (status.status === "paused") {
          setSpeed(0);
          setPhase("paused");
          return;
        }

        setPhase("downloading");
        timer = window.setTimeout(poll, 800);
      } catch (reason) {
        if (cancelled) return;
        setSpeed(0);
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not read the download status.",
        );
        setPhase("error");
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [downloadId, pollEpoch, installDownloadedFile]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let stored: StoredDownload | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      stored = raw ? (JSON.parse(raw) as StoredDownload) : null;
    } catch {
      stored = null;
    }

    if (!stored || typeof stored.id !== "number") return;

    setWifiOnlyState(stored.wifiOnly);
    setPhase("checking");
    sampleRef.current = { bytes: 0, time: Date.now() };
    setDownloadId(stored.id);
  }, []);

  const start = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    setError("");
    setImportProgress(null);
    setBytesDownloaded(0);
    setTotalBytes(0);
    setSpeed(0);
    setPhase("checking");
    sampleRef.current = { bytes: 0, time: Date.now() };

    try {
      const { id } = await NativeDictionaryDownloader.enqueue({
        url: CEDICT_URL,
        fileName: CEDICT_FILE,
        wifiOnly,
      });
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ id, wifiOnly } satisfies StoredDownload),
        );
      } catch {
        // The download still works without persistence.
      }
      setDownloadId(id);
      setPollEpoch((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not start the download. Please try again.",
      );
      setPhase("error");
    }
  }, [wifiOnly]);

  const pause = useCallback(async () => {
    if (!downloadId) return;
    try {
      await NativeDictionaryDownloader.pause({ id: downloadId });
      setPhase("paused");
      setSpeed(0);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not pause the download.",
      );
      setPhase("error");
    }
  }, [downloadId]);

  const resume = useCallback(async () => {
    if (!downloadId) return;
    try {
      await NativeDictionaryDownloader.resume({ id: downloadId });
      setPhase("downloading");
      setPollEpoch((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not resume the download.",
      );
      setPhase("error");
    }
  }, [downloadId]);

  const cancel = useCallback(async () => {
    const id = downloadId;
    if (id) {
      try {
        await NativeDictionaryDownloader.cancel({ id });
      } catch {
        // Best effort; clear local state anyway.
      }
    }
    clearStoredDownload();
    setDownloadId(null);
    setPhase("idle");
    setDownloadStatus("pending");
    setBytesDownloaded(0);
    setTotalBytes(0);
    setSpeed(0);
    setError("");
    setImportProgress(null);
  }, [clearStoredDownload, downloadId]);

  const retry = useCallback(async () => {
    const id = downloadId;
    if (id) {
      try {
        await NativeDictionaryDownloader.cancel({ id });
      } catch {
        // Best effort; start a fresh download.
      }
    }
    clearStoredDownload();
    setDownloadId(null);
    setPhase("idle");
    await start();
  }, [clearStoredDownload, downloadId, start]);

  const busy =
    phase === "checking" ||
    phase === "downloading" ||
    phase === "paused" ||
    phase === "installing";

  return {
    phase,
    downloadStatus,
    bytesDownloaded,
    totalBytes,
    speed,
    error,
    importProgress,
    wifiOnly,
    setWifiOnly,
    busy,
    start,
    pause,
    resume,
    cancel,
    retry,
  };
}

export type NativeCedictDownload = ReturnType<typeof useNativeCedictDownload>;
