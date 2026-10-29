import type { ExamplePack, ExamplePackMeta, ExampleSentence } from "../types";
import {
  getInstalledExamplePack,
  putInstalledExamplePack,
  removeInstalledExamplePack,
} from "./db";

export const EXAMPLE_PACK_MANIFEST_URL =
  "https://raw.githubusercontent.com/amoshydra/souzi/dict-manifest/examples/manifest.json";

type ExamplePackManifest = {
  id: string;
  name: string;
  version: number;
  schema: number;
  entries: number;
  words: number;
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  license: string;
  source: string;
  sourceUrl?: string;
  builtAt?: string;
};

export type ExamplePackProgress = {
  phase: "checking" | "downloading" | "installing";
  loaded: number;
  total: number;
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchExamplePackManifest(): Promise<ExamplePackManifest> {
  const response = await fetch(`${EXAMPLE_PACK_MANIFEST_URL}?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Could not check the example pack.");
  }

  const manifest = (await response.json()) as ExamplePackManifest;
  if (
    manifest.id !== "examples-en-zh" ||
    manifest.schema !== 1 ||
    !manifest.url ||
    !manifest.sha256
  ) {
    throw new Error("The example pack manifest is not supported.");
  }

  return manifest;
}

export async function getExamplePackMeta(): Promise<ExamplePackMeta | null> {
  const pack = await getInstalledExamplePack();
  if (!pack) return null;
  return {
    version: pack.version,
    entries: pack.entries,
    bytes: pack.bytes,
    sha256: pack.sha256,
    source: pack.source,
    license: pack.license,
    installedAt: pack.installedAt,
  };
}

export async function installExamplePack(
  onProgress?: (progress: ExamplePackProgress) => void,
  signal?: AbortSignal,
): Promise<ExamplePackMeta> {
  onProgress?.({ phase: "checking", loaded: 0, total: 0 });
  const manifest = await fetchExamplePackManifest();
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");

  onProgress?.({ phase: "downloading", loaded: 0, total: manifest.bytes });
  const response = await fetch(manifest.url, { cache: "no-store", signal });
  if (!response.ok || !response.body) {
    throw new Error("The example pack could not be downloaded.");
  }

  const total = Number(response.headers.get("content-length")) || manifest.bytes;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException("Cancelled", "AbortError");
    }
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.({ phase: "downloading", loaded, total });
  }

  const compressed = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const digest = toHex(await crypto.subtle.digest("SHA-256", compressed));
  if (digest !== manifest.sha256) {
    throw new Error("The example pack failed its checksum check.");
  }

  onProgress?.({ phase: "installing", loaded, total });
  const stream = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const payload = (await new Response(stream).json()) as {
    version: number;
    source?: string;
    sourceUrl?: string;
    license?: string;
    entries?: number;
    examples?: Record<string, ExampleSentence[]>;
  };

  if (!payload.examples || typeof payload.examples !== "object") {
    throw new Error("The example pack is not valid.");
  }

  const pack: ExamplePack = {
    version: payload.version ?? manifest.version,
    source: payload.source ?? manifest.source,
    sourceUrl: payload.sourceUrl ?? manifest.sourceUrl,
    license: payload.license ?? manifest.license,
    installedAt: new Date().toISOString(),
    entries: payload.entries ?? manifest.entries,
    bytes: manifest.bytes,
    sha256: manifest.sha256,
    examples: payload.examples,
  };

  await putInstalledExamplePack(pack);
  return {
    version: pack.version,
    entries: pack.entries,
    bytes: pack.bytes,
    sha256: pack.sha256,
    source: pack.source,
    license: pack.license,
    installedAt: pack.installedAt,
  };
}

export async function removeExamplePack(): Promise<void> {
  await removeInstalledExamplePack();
}
