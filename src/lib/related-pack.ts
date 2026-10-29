import type {
  RelatedPack,
  RelatedPackMeta,
  RelatedWordGroups,
} from "../types";
import {
  getInstalledRelatedPack,
  putInstalledRelatedPack,
  removeInstalledRelatedPack,
} from "./db";

export const RELATED_PACK_MANIFEST_URL =
  "https://raw.githubusercontent.com/amoshydra/souzi/dict-manifest/related/manifest.json";

type RelatedPackManifest = {
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

export type RelatedPackProgress = {
  phase: "checking" | "downloading" | "installing";
  loaded: number;
  total: number;
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchRelatedPackManifest(): Promise<RelatedPackManifest> {
  let response: Response;
  try {
    response = await fetch(`${RELATED_PACK_MANIFEST_URL}?t=${Date.now()}`, {
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Could not reach the pack server. Check the internet connection or the app's network permission.",
    );
  }
  if (!response.ok) {
    throw new Error("Could not check the related-words pack.");
  }

  const manifest = (await response.json()) as RelatedPackManifest;
  if (
    manifest.id !== "related-en" ||
    manifest.schema !== 1 ||
    !manifest.url ||
    !manifest.sha256
  ) {
    throw new Error("The related-words pack manifest is not supported.");
  }

  return manifest;
}

export async function getRelatedPackMeta(): Promise<RelatedPackMeta | null> {
  const pack = await getInstalledRelatedPack();
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

export async function installRelatedPack(
  onProgress?: (progress: RelatedPackProgress) => void,
  signal?: AbortSignal,
): Promise<RelatedPackMeta> {
  onProgress?.({ phase: "checking", loaded: 0, total: 0 });
  const manifest = await fetchRelatedPackManifest();
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");

  onProgress?.({ phase: "downloading", loaded: 0, total: manifest.bytes });
  let response: Response;
  try {
    response = await fetch(manifest.url, { cache: "no-store", signal });
  } catch {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    throw new Error(
      "Could not download the related-words pack. Check the internet connection or the app's network permission.",
    );
  }
  if (!response.ok || !response.body) {
    throw new Error("The related-words pack could not be downloaded.");
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
    throw new Error("The related-words pack failed its checksum check.");
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
    relations?: Record<string, RelatedWordGroups>;
  };

  if (!payload.relations || typeof payload.relations !== "object") {
    throw new Error("The related-words pack is not valid.");
  }

  const pack: RelatedPack = {
    version: payload.version ?? manifest.version,
    source: payload.source ?? manifest.source,
    sourceUrl: payload.sourceUrl ?? manifest.sourceUrl,
    license: payload.license ?? manifest.license,
    installedAt: new Date().toISOString(),
    entries: payload.entries ?? manifest.entries,
    bytes: manifest.bytes,
    sha256: manifest.sha256,
    relations: payload.relations,
  };

  await putInstalledRelatedPack(pack);
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

export async function removeRelatedPack(): Promise<void> {
  await removeInstalledRelatedPack();
}
