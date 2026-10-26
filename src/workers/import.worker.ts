/// <reference lib="webworker" />

import { gunzipSync, unzipSync } from "fflate";
import frequencyRanks from "../data/frequency.json";
import hskLevels from "../data/hsk30.json";
import { parseCedict } from "../lib/cedict";
import { COMMON_FREQUENCY } from "../lib/common";
import { replaceDictionary } from "../lib/db";
import { buildIndex } from "../lib/indexer";
import type { Entry, ImportProgress, ImportWorkerMessage } from "../types";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: ImportWorkerMessage): void {
  ctx.postMessage(message);
}

function progress(
  phase: ImportProgress["phase"],
  current: number,
  total: number,
  message: string,
): void {
  post({ type: "progress", progress: { phase, current, total, message } });
}

async function decodeFile(buffer: ArrayBuffer, fileName: string): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;

  if (isGzip) {
    progress("decompress", 0, 1, "Decompressing dictionary…");
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
    progress("decompress", 0, 1, "Unzipping dictionary…");
    const files = unzipSync(bytes);
    const names = Object.keys(files);
    const chosen =
      names.find((name) => /\.txt$/i.test(name)) ??
      names.find((name) => /cedict/i.test(name)) ??
      names.find((name) => (files[name]?.length ?? 0) > 1000) ??
      names[0];

    if (!chosen) throw new Error("The zip file is empty.");
    return new TextDecoder("utf-8")
      .decode(files[chosen])
      .replace(/^\uFEFF/, "");
  }

  progress("decompress", 0, 1, `Reading ${fileName}…`);
  return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

ctx.onmessage = async (event: MessageEvent<{ buffer: ArrayBuffer; fileName: string }>) => {
  try {
    const { buffer, fileName } = event.data;
    const text = await decodeFile(buffer, fileName);

    progress("parse", 0, 1, "Parsing CC-CEDICT…");
    const parsed = parseCedict(text, (current, total) => {
      progress(
        "parse",
        current,
        total,
        `Parsing ${current.toLocaleString()} / ${total.toLocaleString()} lines…`,
      );
    });

    if (parsed.length < 1000) {
      throw new Error(
        `Only ${parsed.length.toLocaleString()} entries found. This does not look like CC-CEDICT. ` +
          "Download cedict_1_0_ts_utf-8_mdbg.txt.gz from MDBG and try again.",
      );
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

    progress("index", 0, entries.length, "Building Chinese, pinyin, and English indexes…");
    const index = buildIndex(entries);

    progress("store", 0, entries.length, "Saving dictionary to this device…");
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
        progress(
          "store",
          current,
          total,
          `Saving ${current.toLocaleString()} / ${total.toLocaleString()} entries…`,
        );
      },
    );

    progress("done", entries.length, entries.length, "Dictionary installed");
    post({ type: "done", count: entries.length });
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Import failed.",
    });
  }
};
