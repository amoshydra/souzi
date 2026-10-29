import type { RelatedWordGroups } from "../types";
import { getInstalledRelatedPack } from "./db";

type RelatedMap = Record<string, RelatedWordGroups>;
type RawRelatedMap = Record<string, string[] | RelatedWordGroups>;

const cache = new Map<string, RelatedMap>();

function normalizeGroups(value: string[] | RelatedWordGroups): RelatedWordGroups {
  if (Array.isArray(value)) return { related: value };
  return value ?? {};
}

export async function loadRelatedWords(
  language: "en" | "zh",
): Promise<RelatedMap> {
  const cached = cache.get(language);
  if (cached) return cached;

  if (language === "en") {
    const installed = await getInstalledRelatedPack();
    if (installed?.relations) {
      cache.set(language, installed.relations);
      return installed.relations;
    }
  }

  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/related-${language}.json`,
    );
    if (!response.ok) {
      cache.set(language, {});
      return {};
    }
    const data = (await response.json()) as RawRelatedMap;
    const normalized: RelatedMap = {};
    for (const [word, groups] of Object.entries(data ?? {})) {
      normalized[word] = normalizeGroups(groups);
    }
    cache.set(language, normalized);
    return normalized;
  } catch {
    cache.set(language, {});
    return {};
  }
}

export function clearRelatedWordsCache(): void {
  cache.clear();
}

export function relatedWordsFor(
  map: RelatedMap,
  key: string,
): RelatedWordGroups {
  return map[key.trim().toLowerCase()] ?? {};
}
