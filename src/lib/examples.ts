import hskLevels from "../data/hsk30.json";
import type { EnglishSearchIndex, SearchIndex } from "../types";
import { getEnglishEntriesByIds } from "./db";
import { englishFrequency } from "./english";

const HAN_WORD = /^[\u3400-\u9fff]{2,4}$/;
const ENGLISH_WORD = /^[a-z]{5,11}$/;
const ADVANCED_ENGLISH_TAGS = ["gre", "toefl", "ielts"];
const BASIC_ENGLISH_TAGS = ["zk", "gk", "cet4"];

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
        level >= 4 &&
        level <= 6 &&
        HAN_WORD.test(word) &&
        Boolean(index.simp[word]?.length),
    )
    .sort((a, b) => b[1] - a[1]);

  const unique = [...new Set(candidates.map(([word]) => word))];
  if (unique.length >= count) return sample(unique, count);

  const fallback = index.keys.simp.filter((word) => HAN_WORD.test(word));
  return [...new Set([...unique, ...sample(fallback, count)])].slice(0, count);
}

async function englishExamples(
  index: EnglishSearchIndex,
  count: number,
): Promise<string[]> {
  try {
    const ranges = [8001, 16001, 24001];
    const chunks = await Promise.all(
      ranges.map((start) =>
        getEnglishEntriesByIds(
          Array.from({ length: 400 }, (_, index) => start + index),
        ),
      ),
    );
    const entries = chunks.flat();

    const advanced = entries.filter((entry) => {
      const tags = entry.tags ?? [];
      return (
        ENGLISH_WORD.test(entry.word.trim().toLowerCase()) &&
        ADVANCED_ENGLISH_TAGS.some((tag) => tags.includes(tag)) &&
        !BASIC_ENGLISH_TAGS.some((tag) => tags.includes(tag))
      );
    });
    const advancedWords = [
      ...new Set(advanced.map((entry) => entry.word.trim().toLowerCase())),
    ];
    if (advancedWords.length >= count) {
      return sample(advancedWords, count);
    }

    const lessCommon = entries
      .filter((entry) => {
        const tags = entry.tags ?? [];
        return (
          ENGLISH_WORD.test(entry.word.trim().toLowerCase()) &&
          !BASIC_ENGLISH_TAGS.some((tag) => tags.includes(tag)) &&
          englishFrequency(entry) > 5_000
        );
      })
      .map((entry) => entry.word.trim().toLowerCase());
    const words = [...new Set([...advancedWords, ...lessCommon])];
    if (words.length >= count) return sample(words, count);
  } catch {
    // Fall through to the index-only fallback.
  }

  const words = index.keys.filter((word) => ENGLISH_WORD.test(word));
  return sample([...new Set(words)], count);
}

/**
 * Pick example lookups from the dictionaries actually installed on this device.
 * Chinese candidates come from HSK levels 4–6; English candidates come from the
 * advanced GRE/TOEFL/IELTS portion of the bundled core.
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
