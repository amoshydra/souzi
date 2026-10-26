import type { Entry, SearchIndex } from "../types";

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
  "but",
  "is",
  "are",
  "am",
  "was",
  "were",
  "be",
  "been",
  "being",
  "by",
  "with",
  "from",
  "as",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "he",
  "she",
  "they",
  "them",
  "his",
  "her",
  "their",
  "you",
  "your",
  "we",
  "our",
  "i",
  "me",
  "my",
  "not",
  "no",
  "yes",
  "etc",
  "e.g",
  "i.e",
  "cl",
  "classifier",
  "also",
  "who",
  "which",
  "what",
  "when",
  "where",
  "why",
  "how",
  "into",
  "than",
  "then",
  "there",
  "here",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "very",
  "will",
  "would",
  "should",
  "could",
  "may",
  "might",
  "must",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "so",
  "if",
  "because",
  "about",
  "against",
  "between",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
]);

function add(map: Record<string, number[]>, key: string, id: number): void {
  if (!key) return;
  const existing = map[key];
  if (existing) {
    existing.push(id);
  } else {
    map[key] = [id];
  }
}

function tokensFromDefinitions(definitions: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const definition of definitions) {
    const words = definition.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
    for (const word of words) {
      const cleaned = word.replace(/^['-]+|['-]+$/g, "");
      if (cleaned.length > 1 && !STOPWORDS.has(cleaned)) {
        tokens.add(cleaned);
      }
    }
  }
  return tokens;
}

function capPostings(
  map: Record<string, number[]>,
  max: number,
  priorityById: Map<number, number>,
): void {
  for (const key of Object.keys(map)) {
    if (map[key].length <= max) continue;
    map[key] = map[key]
      .slice()
      .sort(
        (a, b) =>
          (priorityById.get(a) ?? 1e9) - (priorityById.get(b) ?? 1e9) ||
          a - b,
      )
      .slice(0, max);
  }
}

/**
 * Build all lookup maps from a list of entries. The resulting object is
 * structured-cloneable, so it can be stored in IndexedDB and loaded at startup.
 */
export function buildIndex(entries: Entry[]): SearchIndex {
  const simp: Record<string, number[]> = {};
  const trad: Record<string, number[]> = {};
  const pinyin: Record<string, number[]> = {};
  const english: Record<string, number[]> = {};
  const englishPrimary: Record<string, number[]> = {};
  const char: Record<string, number[]> = {};

  for (const entry of entries) {
    add(simp, entry.simp, entry.id);
    add(trad, entry.trad, entry.id);
    add(pinyin, entry.pinyinPlain, entry.id);

    const altPinyin = entry.pinyinPlain.replace(/v/g, "u");
    if (altPinyin !== entry.pinyinPlain) add(pinyin, altPinyin, entry.id);

    const chars = new Set<string>([...entry.simp, ...entry.trad]);
    for (const character of chars) {
      add(char, character, entry.id);
    }

    for (const token of tokensFromDefinitions(entry.definitions)) {
      add(english, token, entry.id);
    }

    const primaryDefinition = entry.definitions[0];
    if (primaryDefinition) {
      for (const token of tokensFromDefinitions([primaryDefinition])) {
        add(englishPrimary, token, entry.id);
      }
    }
  }

  // Keep the most frequent headwords at the front of every posting list. The
  // search engine slices candidates before it has full entry records, so this
  // ordering decides which common words survive that first cut.
  const priorityById = new Map(
    entries.map((entry) => [entry.id, entry.frequency ?? 1e9]),
  );

  const sortPostings = (map: Record<string, number[]>) => {
    for (const key of Object.keys(map)) {
      if (map[key].length > 1) {
        map[key].sort(
          (a, b) =>
            (priorityById.get(a) ?? 1e9) - (priorityById.get(b) ?? 1e9) ||
            a - b,
        );
      }
    }
  };

  sortPostings(simp);
  sortPostings(trad);
  sortPostings(pinyin);
  sortPostings(english);
  sortPostings(englishPrimary);
  sortPostings(char);

  // Very common gloss words can map to thousands of entries. Keep search fast,
  // but keep the most frequent headwords rather than an arbitrary file slice.
  capPostings(english, 800, priorityById);
  capPostings(englishPrimary, 800, priorityById);

  return {
    simp,
    trad,
    pinyin,
    english,
    englishPrimary,
    char,
    keys: {
      simp: Object.keys(simp).sort(),
      trad: Object.keys(trad).sort(),
      pinyin: Object.keys(pinyin).sort(),
      english: Object.keys(english).sort(),
      char: Object.keys(char).sort(),
    },
  };
}

export function indexStats(index: SearchIndex): {
  headwords: number;
  pinyinKeys: number;
  englishKeys: number;
  characters: number;
} {
  return {
    headwords: index.keys.simp.length,
    pinyinKeys: index.keys.pinyin.length,
    englishKeys: index.keys.english.length,
    characters: index.keys.char.length,
  };
}
