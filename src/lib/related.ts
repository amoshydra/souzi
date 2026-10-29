type RelatedMap = Record<string, string[]>;

const cache = new Map<string, RelatedMap>();

export async function loadRelatedWords(
  language: "en" | "zh",
): Promise<RelatedMap> {
  const cached = cache.get(language);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/related-${language}.json`,
    );
    if (!response.ok) {
      cache.set(language, {});
      return {};
    }
    const data = (await response.json()) as RelatedMap;
    cache.set(language, data ?? {});
    return data ?? {};
  } catch {
    cache.set(language, {});
    return {};
  }
}

export function relatedWordsFor(map: RelatedMap, key: string): string[] {
  return map[key.trim().toLowerCase()] ?? [];
}
