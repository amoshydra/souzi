/// <reference lib="webworker" />

import { gunzipSync, unzipSync } from "fflate";
import frequencyRanks from "../data/frequency.json";
import hskLevels from "../data/hsk30.json";
import { parseCedict } from "../lib/cedict";
import { COMMON_FREQUENCY } from "../lib/common";
import { replaceDictionary } from "../lib/db";
import { buildIndex } from "../lib/indexer";
import { AppError, asAppError } from "../i18n/errors";
import type { Entry, ImportProgress, ImportWorkerMessage } from "../types";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: ImportWorkerMessage): void {
  ctx.postMessage(message);
}

function progress(
  phase: ImportProgress["phase"],
  current: number,
  total: number,
): void {
  post({ type: "progress", progress: { phase, current, total } });
}

async function decodeFile(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;

  if (isGzip) {
    progress("decompress", 0, 1);
    let decompressed: Uint8Array;
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(
        new DecompressionStream("gzip"),
      );
      decompressed = new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      decompressed = gunzipSync(bytes);
    }
    return new TextDecoder("utf-8").decode(decompressed).replace(/^\uFEFF/, "");
  }

  if (isZip) {
    progress("decompress", 0, 1);
    const files = unzipSync(bytes);
    const names = Object.keys(files);
    const chosen =
      names.find((name) => /\.txt$/i.test(name)) ??
      names.find((name) => /cedict/i.test(name)) ??
      names.find((name) => (files[name]?.length ?? 0) > 1000) ??
      names[0];

    if (!chosen) throw new AppError("errors.zipEmpty");
    return new TextDecoder("utf-8")
      .decode(files[chosen])
      .replace(/^\uFEFF/, "");
  }

  progress("decompress", 0, 1);
  return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

ctx.onmessage = async (event: MessageEvent<{ buffer: ArrayBuffer; fileName: string }>) => {
  try {
    const { buffer } = event.data;
    const text = await decodeFile(buffer);

    progress("parse", 0, 1);
    const parsed = parseCedict(text, (current, total) => {
      progress("parse", current, total);
    });

    if (parsed.length < 1000) {
      throw new AppError("errors.notCedict", { count: parsed.length });
    }

    const entries: Entry[] = parsed.map((entry, index) => ({
      ...entry,
      id: index + 1,
      source: "cedict",
      hsk: (hskLevels as Record<string, number>)[entry.simp] ??
        (hskLevels as Record<string, number>)[entry.trad],
      frequency:
        COMMON_FREQUENCY[entry.simp] ??
        (frequencyRanks as Record<string, number>)[entry.simp],
    }));

    progress("index", 0, entries.length);
    const index = buildIndex(entries);

    progress("store", 0, entries.length);
    await replaceDictionary(
      entries,
      index,
      {
        count: entries.length,
        importedAt: new Date().toISOString(),
        source: "CC-CEDICT (user-imported)",
        kind: "cedict",
      },
      (current, total) => {
        progress("store", current, total);
      },
    );

    progress("done", entries.length, entries.length);
    post({ type: "done", count: entries.length });
  } catch (error) {
    const appError = asAppError(error, "errors.importFailed");
    post({
      type: "error",
      code: appError.code,
      params: appError.params,
    });
  }
};
