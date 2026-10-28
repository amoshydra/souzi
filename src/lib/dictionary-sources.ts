/**
 * Static data endpoints for the optional full dictionary pack.
 *
 * The manifest is the stable URL. It points at an immutable, versioned pack.
 * Keep this in sync with `.github/workflows/dictionary.yml`.
 */
export const FULL_ECDICT_MANIFEST_URL =
  import.meta.env.VITE_FULL_ECDICT_MANIFEST_URL ??
  "https://amoshydra.github.io/souzi/ecdict/manifest.json";

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
