import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  fetchFullEnglishManifest,
  type FullEnglishManifest,
} from "../lib/dictionary-sources";
import { installFullEnglishPack } from "../lib/full-english";
import { NativeDictionaryDownloader } from "../lib/native-download";
import type { FullEnglishMeta } from "../types";

const STORAGE_KEY = "souzi-full-english-download";
const WIFI_KEY = "souzi-full-english-wifi-only";

export type FullEnglishDownloadPhase =
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
  manifest: FullEnglishManifest;
};

export type FullEnglishDownload = {
  phase: FullEnglishDownloadPhase;
  downloadStatus: string;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  error: string;
  wifiOnly: boolean;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
  retry: () => Promise<void>;
  setWifiOnly: (value: boolean) => void;
};

export function useFullEnglishDownload({
  onInstalled,
}: {
  onInstalled: (meta: FullEnglishMeta) => Promise<void> | void;
}): FullEnglishDownload {
  const [phase, setPhase] = useState<FullEnglishDownloadPhase>("idle");
  const [downloadStatus, setDownloadStatus] = useState("pending");
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState("");
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [storedManifest, setStoredManifest] =
    useState<FullEnglishManifest | null>(null);
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
  const installingRef = useRef(false);
  const wifiOnlyRef = useRef(wifiOnly);

  useEffect(() => {
    onInstalledRef.current = onInstalled;
  }, [onInstalled]);

  const clearStoredDownload = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const setWifiOnly = useCallback(
    (value: boolean) => {
      wifiOnlyRef.current = value;
      setWifiOnlyState(value);
      try {
        localStorage.setItem(WIFI_KEY, String(value));
      } catch {
        // The download still works without persistence.
      }
      if (downloadId !== null && Capacitor.isNativePlatform()) {
        void NativeDictionaryDownloader.setWifiOnly({
          id: downloadId,
          wifiOnly: value,
        }).catch(() => {
          // The current download can continue with its existing setting.
        });
      }
    },
    [downloadId],
  );

  const installDownloadedPack = useCallback(
    async (id: number, manifest: FullEnglishManifest) => {
      if (installingRef.current) return;
      installingRef.current = true;
      setPhase("installing");
      setSpeed(0);

      try {
        const status = await NativeDictionaryDownloader.status({ id });
        const meta = await installFullEnglishPack(
          status.localPath,
          manifest.sha256,
          true,
        );
        clearStoredDownload();
        setDownloadId(null);
        setPhase("done");
        await onInstalledRef.current(meta);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "The full dictionary could not be installed. Please try again.",
        );
        setPhase("error");
      } finally {
        installingRef.current = false;
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
          if (storedManifest) {
            void installDownloadedPack(downloadId, storedManifest);
          } else {
            setError("The download is complete, but its manifest is missing.");
            setPhase("error");
          }
          return;
        }

        if (status.status === "failed") {
          setSpeed(0);
          setError("The download did not finish. Please try again.");
          setPhase("error");
          return;
        }

        if (status.status === "paused" || status.status === "waiting") {
          setSpeed(0);
          setPhase(status.status === "paused" ? "paused" : "downloading");
          if (status.status === "waiting") {
            timer = window.setTimeout(poll, 1000);
          }
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
  }, [downloadId, pollEpoch, installDownloadedPack, storedManifest]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let stored: StoredDownload | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      stored = raw ? (JSON.parse(raw) as StoredDownload) : null;
    } catch {
      stored = null;
    }

    if (!stored || typeof stored.id !== "number" || !stored.manifest) return;

    setWifiOnlyState(stored.wifiOnly);
    setStoredManifest(stored.manifest);
    setPhase("checking");
    sampleRef.current = { bytes: 0, time: Date.now() };
    setDownloadId(stored.id);
  }, []);

  const start = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    setError("");
    setBytesDownloaded(0);
    setTotalBytes(0);
    setSpeed(0);
    setPhase("checking");
    sampleRef.current = { bytes: 0, time: Date.now() };

    try {
      const manifest = await fetchFullEnglishManifest();
      const fileName = `ecdict-full-v${manifest.version}.sqlite.gz`;
      const { id } = await NativeDictionaryDownloader.enqueue({
        url: manifest.url,
        fileName,
        wifiOnly,
      });

      if (wifiOnlyRef.current !== wifiOnly) {
        try {
          await NativeDictionaryDownloader.setWifiOnly({
            id,
            wifiOnly: wifiOnlyRef.current,
          });
        } catch {
          // The download can continue with the setting used at start.
        }
      }

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ id, wifiOnly, manifest } satisfies StoredDownload),
        );
      } catch {
        // The download still works without persistence.
      }

      setStoredManifest(manifest);
      setDownloadId(id);
      setPollEpoch((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The full dictionary download could not start.",
      );
      setPhase("error");
    }
  }, [wifiOnly]);

  const pause = useCallback(async () => {
    if (downloadId === null) return;
    await NativeDictionaryDownloader.pause({ id: downloadId });
    setPhase("paused");
  }, [downloadId]);

  const resume = useCallback(async () => {
    if (downloadId === null) return;
    await NativeDictionaryDownloader.resume({ id: downloadId });
    setPhase("downloading");
    setPollEpoch((value) => value + 1);
  }, [downloadId]);

  const cancel = useCallback(async () => {
    if (downloadId === null) return;
    await NativeDictionaryDownloader.cancel({ id: downloadId });
    clearStoredDownload();
    setDownloadId(null);
    setStoredManifest(null);
    setPhase("idle");
  }, [clearStoredDownload, downloadId]);

  const retry = useCallback(async () => {
    if (downloadId !== null) {
      try {
        await NativeDictionaryDownloader.cancel({ id: downloadId });
      } catch {
        // Best effort.
      }
    }
    clearStoredDownload();
    setDownloadId(null);
    setStoredManifest(null);
    await start();
  }, [clearStoredDownload, downloadId, start]);

  return {
    phase,
    downloadStatus,
    bytesDownloaded,
    totalBytes,
    speed,
    error,
    wifiOnly,
    start,
    pause,
    resume,
    cancel,
    retry,
    setWifiOnly,
  };
}
