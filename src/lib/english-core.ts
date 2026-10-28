import { Capacitor } from "@capacitor/core";
import { gunzipSync } from "fflate";
import type {
  EnglishCoreMeta,
  EnglishEntry,
  EnglishSearchIndex,
} from "../types";
import { buildEnglishIndex } from "./english";
import { definitionLines, translationLines } from "./ecdict-text";
import { installEnglishCore, loadEnglishCore } from "./db";

export const ECDICT_CORE_VERSION = 1;

type CorePayload = {
  version: number;
  source: string;
  license: string;
  generatedAt: string;
  count: number;
  entries: Omit<EnglishEntry, "source">[];
};

let corePromise: Promise<{
  index: EnglishSearchIndex;
  meta: EnglishCoreMeta;
}> | null = null;

async function decodeBytes(bytes: Uint8Array): Promise<string> {
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return new TextDecoder("utf-8").decode(bytes);
  }

  try {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const stream = new Blob([buffer])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch {
    return new TextDecoder("utf-8").decode(gunzipSync(bytes));
  }
}

async function downloadCore(): Promise<CorePayload> {
  const baseUrl = `${import.meta.env.BASE_URL}data/ecdict-core`;

  // Android asset packaging decompresses .gz files and strips the suffix, so
  // the native app sees ecdict-core.json. Web keeps the smaller gzip asset.
  const urls = Capacitor.isNativePlatform()
    ? [`${baseUrl}.json`, `${baseUrl}.json.gz`]
    : [`${baseUrl}.json.gz`];

  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(
          `Could not load the English core (HTTP ${response.status}).`,
        );
        continue;
      }

      const text = await decodeBytes(
        new Uint8Array(await response.arrayBuffer()),
      );
      const payload = JSON.parse(text) as CorePayload;

      if (
        !payload ||
        !Array.isArray(payload.entries) ||
        payload.entries.length === 0
      ) {
        throw new Error("The bundled English core is empty or malformed.");
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not load the bundled English core.");
}

/**
 * Load the bundled ECDICT core into IndexedDB if needed.
 *
 * This is deliberately lazy: the app shell and the starter dictionary render
 * first, then the English→Chinese core installs in the background.
 */
export function ensureEnglishCore(): Promise<{
  index: EnglishSearchIndex;
  meta: EnglishCoreMeta;
}> {
  if (!corePromise) {
    corePromise = (async () => {
      const existing = await loadEnglishCore();
      if (existing && existing.meta.version === ECDICT_CORE_VERSION) {
        return existing;
      }

      const payload = await downloadCore();
      const entries: EnglishEntry[] = payload.entries.map((entry) => ({
        ...entry,
        translations: translationLines(entry.translations.join("\n")),
        definitions: definitionLines(entry.definitions.join("\n")),
        source: "ecdict",
      }));
      const index = buildEnglishIndex(entries);
      const meta: EnglishCoreMeta = {
        count: entries.length,
        installedAt: new Date().toISOString(),
        source: "ECDICT core",
        license: "MIT",
        version: ECDICT_CORE_VERSION,
      };

      await installEnglishCore(entries, index, meta);
      return { index, meta };
    })().catch((error: unknown) => {
      corePromise = null;
      throw error;
    });
  }

  return corePromise;
}
