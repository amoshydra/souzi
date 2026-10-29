import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRelatedPackManifest,
  getRelatedPackMeta,
  installRelatedPack,
  removeRelatedPack,
  type RelatedPackProgress,
} from "../lib/related-pack";
import { clearRelatedWordsCache } from "../lib/related";
import type { RelatedPackMeta } from "../types";

export type RelatedPackPhase =
  | "loading"
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

export type RelatedPackState = {
  phase: RelatedPackPhase;
  meta: RelatedPackMeta | null;
  remoteVersion: number | null;
  progress: RelatedPackProgress | null;
  error: string;
  install: () => Promise<void>;
  remove: () => Promise<void>;
  cancel: () => void;
};

export function useRelatedPack(): RelatedPackState {
  const [phase, setPhase] = useState<RelatedPackPhase>("loading");
  const [meta, setMeta] = useState<RelatedPackMeta | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<number | null>(null);
  const [progress, setProgress] = useState<RelatedPackProgress | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void getRelatedPackMeta().then((installed) => {
      if (!active) return;
      setMeta(installed);
      setPhase(installed ? "ready" : "idle");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!meta) return;
    let active = true;
    void fetchRelatedPackManifest()
      .then((manifest) => {
        if (active) setRemoteVersion(manifest.version);
      })
      .catch(() => {
        // Offline or the manifest is unavailable; keep the installed pack.
      });
    return () => {
      active = false;
    };
  }, [meta]);

  const install = useCallback(async () => {
    setError("");
    setProgress(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("checking");

    try {
      const installed = await installRelatedPack((next) => {
        setProgress(next);
        setPhase(next.phase);
      }, controller.signal);
      clearRelatedWordsCache();
      setMeta(installed);
      setRemoteVersion(installed.version);
      setPhase("ready");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setPhase(meta ? "ready" : "idle");
        return;
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "The related-words pack could not be installed.",
      );
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }, [meta]);

  const remove = useCallback(async () => {
    await removeRelatedPack();
    clearRelatedWordsCache();
    setMeta(null);
    setRemoteVersion(null);
    setProgress(null);
    setPhase("idle");
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    phase,
    meta,
    remoteVersion,
    progress,
    error,
    install,
    remove,
    cancel,
  };
}
