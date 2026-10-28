import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
  EnglishEntry,
  EnglishMatchKind,
  EnglishSearchCandidate,
  FullEnglishMeta,
} from "../types";
import { englishTypoKeys, normalizeEnglishWord } from "./english";
import { lemmaCandidates } from "./lemma";

type WordMatch = {
  key: string;
  id: number;
  priority: number;
};

type FormMatch = {
  key: string;
  id: number;
};

type FullEntryRow = {
  id: number;
  word: string;
  phonetic: string;
  translation: string;
  definition: string;
  pos: string;
  tags: string;
  collins: number;
  oxford: number;
  bnc: number;
  frq: number;
  exchange: string;
};

type FullEnglishPlugin = {
  status(): Promise<{ installed: boolean; meta?: FullEnglishMeta }>;
  install(options: {
    sourcePath: string;
    sha256: string;
    deleteSource: boolean;
  }): Promise<{ installed: boolean; meta?: FullEnglishMeta }>;
  remove(): Promise<void>;
  lookupWords(options: { keys: string[] }): Promise<{ matches: WordMatch[] }>;
  lookupForms(options: { keys: string[] }): Promise<{ matches: FormMatch[] }>;
  prefix(options: { query: string; limit: number }): Promise<{ ids: number[] }>;
  entries(options: { ids: number[] }): Promise<{ entries: FullEntryRow[] }>;
};

const ENGLISH_WORD = /^[a-z][a-z' .-]*$/;

export const FullEnglishDictionary =
  registerPlugin<FullEnglishPlugin>("FullEnglishDictionary");

export function isFullEnglishAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getFullEnglishStatus(): Promise<FullEnglishMeta | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await FullEnglishDictionary.status();
    return result.installed && result.meta ? result.meta : null;
  } catch {
    return null;
  }
}

export async function installFullEnglishPack(
  sourcePath: string,
  sha256: string,
  deleteSource = true,
): Promise<FullEnglishMeta> {
  const result = await FullEnglishDictionary.install({
    sourcePath,
    sha256,
    deleteSource,
  });
  if (!result.installed || !result.meta) {
    throw new Error("The full dictionary could not be installed.");
  }
  return result.meta;
}

export async function removeFullEnglishPack(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await FullEnglishDictionary.remove();
}

function addCandidate(
  out: Map<number, EnglishSearchCandidate>,
  id: number,
  match: EnglishMatchKind,
  rank: number,
): void {
  const existing = out.get(id);
  if (!existing || rank < existing.rank) {
    out.delete(id);
    out.set(id, { id, match, rank });
  }
}

export async function searchFullEnglish(
  rawQuery: string,
): Promise<EnglishSearchCandidate[]> {
  const query = normalizeEnglishWord(rawQuery);
  if (!query || !ENGLISH_WORD.test(query)) return [];

  const lemmaKeys = [...new Set(lemmaCandidates(query))].filter(Boolean);
  const [wordResult, formResult, prefixResult] = await Promise.all([
    FullEnglishDictionary.lookupWords({ keys: lemmaKeys }),
    FullEnglishDictionary.lookupForms({ keys: [query] }),
    query.length >= 2
      ? FullEnglishDictionary.prefix({ query, limit: 80 })
      : Promise.resolve({ ids: [] as number[] }),
  ]);

  const out = new Map<number, EnglishSearchCandidate>();
  for (const match of wordResult.matches) {
    addCandidate(out, match.id, match.key === query ? "word" : "lemma", match.key === query ? 0 : 0.6);
  }
  for (const match of formResult.matches) {
    addCandidate(out, match.id, "variant", 0.3);
  }
  for (const id of prefixResult.ids) {
    addCandidate(out, id, "prefix", 2);
  }

  return [...out.values()].sort((a, b) => a.rank - b.rank).slice(0, 60);
}

function commonPrefix(a: string, b: string): number {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) {
    length += 1;
  }
  return length;
}

export async function suggestFullEnglishSpellings(
  rawQuery: string,
  limit = 3,
): Promise<string[]> {
  const query = normalizeEnglishWord(rawQuery);
  const candidates = englishTypoKeys(query);
  if (candidates.length === 0) return [];

  const [wordResult, formResult] = await Promise.all([
    FullEnglishDictionary.lookupWords({ keys: candidates }),
    FullEnglishDictionary.lookupForms({ keys: candidates }),
  ]);

  const existing = new Map<
    string,
    { word: WordMatch | null; form: FormMatch | null }
  >();
  for (const match of wordResult.matches) {
    const current = existing.get(match.key) ?? { word: null, form: null };
    if (!current.word || match.priority < current.word.priority) {
      current.word = match;
    }
    existing.set(match.key, current);
  }
  for (const match of formResult.matches) {
    const current = existing.get(match.key) ?? { word: null, form: null };
    current.form = match;
    existing.set(match.key, current);
  }

  return [...existing.entries()]
    .sort(([a, left], [b, right]) => {
      const leftPriority = left.word?.priority ?? 1e9;
      const rightPriority = right.word?.priority ?? 1e9;
      return (
        commonPrefix(b, query) - commonPrefix(a, query) ||
        (a[0] === query[0] ? 0 : 1) - (b[0] === query[0] ? 0 : 1) ||
        (a.at(-1) === query.at(-1) ? 0 : 1) -
          (b.at(-1) === query.at(-1) ? 0 : 1) ||
        (left.word ? 0 : 1) - (right.word ? 0 : 1) ||
        leftPriority - rightPriority ||
        a.localeCompare(b)
      );
    })
    .map(([word]) => word)
    .slice(0, limit);
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function getFullEnglishEntriesByIds(
  ids: number[],
): Promise<EnglishEntry[]> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return [];

  const result = await FullEnglishDictionary.entries({ ids: unique });
  return result.entries.map((entry) => ({
    id: entry.id,
    word: entry.word,
    phonetic: entry.phonetic,
    translations: splitLines(entry.translation),
    definitions: splitLines(entry.definition),
    pos: entry.pos,
    tags: entry.tags.split(/\s+/).filter(Boolean),
    collins: entry.collins,
    oxford: entry.oxford,
    bnc: entry.bnc,
    frq: entry.frq,
    exchange: entry.exchange,
    source: "ecdict",
  }));
}
