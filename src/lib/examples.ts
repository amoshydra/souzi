import hskLevels from "../data/hsk30.json";
import type { EnglishSearchIndex, SearchIndex } from "../types";
import { getEnglishEntriesByIds } from "./db";
import { englishFrequency } from "./english";

const HAN_WORD = /^[\u3400-\u9fff]{2,4}$/;
const ENGLISH_WORD = /^[a-z]{4,8}$/;

function sample<T>(values: T[], count: number): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy.slice(0, count);
}

function chineseExamples(
  index: SearchIndex,
  count: number,
): string[] {
  const levels = hskLevels as Record<string, number>;
  const candidates = Object.entries(levels)
    .filter(
      ([word, level]) =>
        level > 0 &&
        level <= 3 &&
        HAN_WORD.test(word) &&
        Boolean(index.simp[word]?.length),
    )
    .sort((a, b) => a[1] - b[1]);

  const beginnerCandidates = candidates.filter(([, level]) => level <= 2);
  const preferred =
    beginnerCandidates.length >= count ? beginnerCandidates : candidates;
  const unique = [...new Set(preferred.map(([word]) => word))];
  if (unique.length >= count) return sample(unique, count);

  const fallback = index.keys.simp.filter((word) => HAN_WORD.test(word));
  return [...new Set([...unique, ...sample(fallback, count)])].slice(0, count);
}

async function englishExamples(
  index: EnglishSearchIndex,
  count: number,
): Promise<string[]> {
  try {
    const entries = await getEnglishEntriesByIds(
      Array.from({ length: 600 }, (_, index) => index + 1),
    );
    const ranked = entries
      .map((entry) => ({
        frequency: englishFrequency(entry),
        word: entry.word.trim().toLowerCase(),
      }))
      .filter(
        ({ frequency, word }) =>
          ENGLISH_WORD.test(word) &&
          frequency > 0 &&
          frequency < 30_000,
      )
      .sort((a, b) => a.frequency - b.frequency);

    const words = [...new Set(ranked.slice(0, 40).map(({ word }) => word))];
    if (words.length >= count) return sample(words, count);
  } catch {
    // Fall through to the index-only fallback.
  }

  const words = index.keys.filter((word) => ENGLISH_WORD.test(word));
  return sample([...new Set(words)], count);
}

/**
 * Pick example lookups from the dictionaries actually installed on this device.
 * Chinese candidates come from HSK levels 1–3; English candidates come from the
 * most useful part of the bundled core.
 */
export async function loadExampleQueries(
  index: SearchIndex | null,
  englishIndex: EnglishSearchIndex | null,
  limit = 4,
): Promise<string[]> {
  const hasChinese = Boolean(index);
  const hasEnglish = Boolean(englishIndex);
  if (!hasChinese && !hasEnglish) return [];

  const chineseCount = hasChinese
    ? hasEnglish
      ? Math.ceil(limit / 2)
      : limit
    : 0;
  const englishCount = hasEnglish ? limit - chineseCount : 0;

  const chinese = index ? chineseExamples(index, chineseCount) : [];
  const english = englishIndex
    ? await englishExamples(englishIndex, englishCount)
    : [];

  return [...chinese, ...english].slice(0, limit);
}
