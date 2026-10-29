import { useCallback, useEffect, useRef, useState } from "react";
import {
  getExamplePackMeta,
  installExamplePack,
  removeExamplePack,
  type ExamplePackProgress,
} from "../lib/example-pack";
import { clearExampleSentenceCache } from "../lib/example-sentences";
import type { ExamplePackMeta } from "../types";

export type ExamplePackPhase =
  | "loading"
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

export type ExamplePackState = {
  phase: ExamplePackPhase;
  meta: ExamplePackMeta | null;
  progress: ExamplePackProgress | null;
  error: string;
  install: () => Promise<void>;
  remove: () => Promise<void>;
  cancel: () => void;
};

export function useExamplePack(): ExamplePackState {
  const [phase, setPhase] = useState<ExamplePackPhase>("loading");
  const [meta, setMeta] = useState<ExamplePackMeta | null>(null);
  const [progress, setProgress] = useState<ExamplePackProgress | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void getExamplePackMeta().then((installed) => {
      if (!active) return;
      setMeta(installed);
      setPhase(installed ? "ready" : "idle");
    });
    return () => {
      active = false;
    };
  }, []);

  const install = useCallback(async () => {
    setError("");
    setProgress(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("checking");

    try {
      const installed = await installExamplePack((next) => {
        setProgress(next);
        setPhase(next.phase);
      }, controller.signal);
      clearExampleSentenceCache();
      setMeta(installed);
      setPhase("ready");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setPhase(meta ? "ready" : "idle");
        return;
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "The example pack could not be installed.",
      );
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }, [meta]);

  const remove = useCallback(async () => {
    await removeExamplePack();
    clearExampleSentenceCache();
    setMeta(null);
    setProgress(null);
    setPhase("idle");
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { phase, meta, progress, error, install, remove, cancel };
}
