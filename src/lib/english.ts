import type {
  EnglishEntry,
  EnglishMatchKind,
  EnglishSearchCandidate,
  EnglishSearchIndex,
} from "../types";
import { lemmaCandidates } from "./lemma";
import { prefixIds } from "./prefix";

const ENGLISH_WORD = /^[a-z][a-z' .-]*$/;

export function normalizeEnglishWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
}

export function englishFrequency(entry: EnglishEntry): number {
  const ranks = [entry.frq, entry.bnc].filter((rank) => rank > 0);
  return ranks.length > 0 ? Math.min(...ranks) : 1e9;
}

function add(
  map: Record<string, number[]>,
  key: string,
  id: number,
): void {
  if (!key) return;
  const existing = map[key];
  if (existing) existing.push(id);
  else map[key] = [id];
}

function exchangeForms(exchange: string): string[] {
  const forms = new Set<string>();
  for (const part of exchange.split("/")) {
    const [, value] = part.split(":");
    if (!value) continue;
    for (const raw of value.split(/\s+/)) {
      const form = normalizeEnglishWord(raw);
      if (
        form.length > 1 &&
        ENGLISH_WORD.test(form) &&
        /[aeiouy]/.test(form)
      ) {
        forms.add(form);
      }
    }
  }
  return [...forms];
}

function sortPostings(
  map: Record<string, number[]>,
  priorityById: Map<number, number>,
): void {
  for (const key of Object.keys(map)) {
    if (map[key].length > 1) {
      map[key].sort(
        (a, b) =>
          (priorityById.get(a) ?? 1e9) - (priorityById.get(b) ?? 1e9) ||
          a - b,
      );
    }
  }
}

export function buildEnglishIndex(entries: EnglishEntry[]): EnglishSearchIndex {
  const words: Record<string, number[]> = {};
  const variants: Record<string, number[]> = {};
  const priorityById = new Map(
    entries.map((entry) => [entry.id, englishFrequency(entry)]),
  );

  for (const entry of entries) {
    const word = normalizeEnglishWord(entry.word);
    add(words, word, entry.id);

    for (const form of exchangeForms(entry.exchange)) {
      if (form !== word) add(variants, form, entry.id);
    }
  }

  sortPostings(words, priorityById);
  sortPostings(variants, priorityById);

  return {
    words,
    variants,
    keys: Object.keys(words).sort(),
  };
}

export function searchEnglishIndex(
  index: EnglishSearchIndex,
  rawQuery: string,
): EnglishSearchCandidate[] {
  const query = normalizeEnglishWord(rawQuery);
  if (!query || !ENGLISH_WORD.test(query)) return [];

  const out = new Map<number, EnglishSearchCandidate>();
  const addCandidate = (id: number, match: EnglishMatchKind, rank: number) => {
    const existing = out.get(id);
    if (!existing || rank < existing.rank) {
      out.delete(id);
      out.set(id, { id, match, rank });
    }
  };

  for (const id of index.words[query] ?? []) addCandidate(id, "word", 0);
  for (const id of index.variants[query] ?? []) {
    addCandidate(id, "variant", 0.3);
  }

  for (const lemma of lemmaCandidates(query)) {
    if (lemma === query) continue;
    for (const id of index.words[lemma] ?? []) {
      addCandidate(id, "lemma", 0.6);
    }
  }

  if (query.length >= 2) {
    for (const id of prefixIds(index.keys, index.words, query, 80)) {
      addCandidate(id, "prefix", 2);
    }
  }

  return [...out.values()].sort((a, b) => a.rank - b.rank).slice(0, 60);
}
