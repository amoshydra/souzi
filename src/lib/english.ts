import type {
  EnglishEntry,
  EnglishMatchKind,
  EnglishSearchCandidate,
  EnglishSearchIndex,
} from "../types";
import { lemmaCandidates } from "./lemma";
import { prefixIds } from "./prefix";

const ENGLISH_WORD = /^[a-z][a-z' .-]*$/;
const TYPO_QUERY = /^[a-z]{4,}$/;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

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

export function suggestEnglishSpellings(
  index: EnglishSearchIndex,
  rawQuery: string,
  limit = 3,
): string[] {
  const query = normalizeEnglishWord(rawQuery);
  if (!TYPO_QUERY.test(query)) return [];

  const candidates = new Set<string>();
  const add = (candidate: string) => {
    if (candidate !== query && candidate.length > 1) candidates.add(candidate);
  };

  for (let position = 0; position < query.length; position += 1) {
    add(query.slice(0, position) + query.slice(position + 1));
    if (position < query.length - 1) {
      add(
        query.slice(0, position) +
          query[position + 1] +
          query[position] +
          query.slice(position + 2),
      );
    }
    for (const letter of LETTERS) {
      add(
        query.slice(0, position) +
          letter +
          query.slice(position + 1),
      );
      add(
        query.slice(0, position) +
          letter +
          query.slice(position),
      );
    }
  }

  const existing = [...candidates].filter(
    (candidate) =>
      Boolean(index.words[candidate]?.length) ||
      Boolean(index.variants[candidate]?.length),
  );

  const firstId = (candidate: string) =>
    index.words[candidate]?.[0] ??
    index.variants[candidate]?.[0] ??
    1e9;
  const commonPrefix = (candidate: string) => {
    let length = 0;
    while (
      length < candidate.length &&
      length < query.length &&
      candidate[length] === query[length]
    ) {
      length += 1;
    }
    return length;
  };

  return existing
    .sort((a, b) => {
      const firstA = a[0] === query[0] ? 0 : 1;
      const firstB = b[0] === query[0] ? 0 : 1;
      const lastA = a.at(-1) === query.at(-1) ? 0 : 1;
      const lastB = b.at(-1) === query.at(-1) ? 0 : 1;
      const wordA = index.words[a] ? 0 : 1;
      const wordB = index.words[b] ? 0 : 1;
      return (
        commonPrefix(b) - commonPrefix(a) ||
        firstA - firstB ||
        lastA - lastB ||
        Math.abs(a.length - query.length) -
          Math.abs(b.length - query.length) ||
        wordA - wordB ||
        firstId(a) - firstId(b) ||
        a.localeCompare(b)
      );
    })
    .slice(0, limit);
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
