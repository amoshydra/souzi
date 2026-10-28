/**
 * Static data endpoints for the optional full dictionary pack.
 *
 * The manifest lives on the `dict-manifest` branch so the stable raw URL works
 * with CORS (GitHub Releases assets do not) and is re-pointed each time a new
 * `dict-vN` release is published. The pack itself is served straight from that
 * Release asset.
 */
export const FULL_ECDICT_MANIFEST_URL =
  import.meta.env.VITE_FULL_ECDICT_MANIFEST_URL ??
  "https://raw.githubusercontent.com/amoshydra/souzi/dict-manifest/ecdict/manifest.json";

export type FullEnglishManifest = {
  schema: number;
  version: number;
  entries: number;
  file: string;
  url: string;
  mirror?: string | null;
  bytes: number;
  sha256: string;
  license: string;
  source: string;
  sourceCommit?: string;
};

export async function fetchFullEnglishManifest(): Promise<FullEnglishManifest> {
  const response = await fetch(
    `${FULL_ECDICT_MANIFEST_URL}?t=${Date.now()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`Dictionary manifest HTTP ${response.status}`);
  }

  const manifest = (await response.json()) as FullEnglishManifest;
  if (
    !manifest ||
    typeof manifest.version !== "number" ||
    typeof manifest.url !== "string" ||
    typeof manifest.sha256 !== "string" ||
    typeof manifest.bytes !== "number" ||
    !manifest.url.startsWith("https://")
  ) {
    throw new Error("Dictionary manifest is invalid.");
  }
  return manifest;
}
