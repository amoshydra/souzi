import type { MatchKind, SearchCandidate, SearchIndex } from "../types";
import { lemmaCandidates } from "./lemma";
import { normalizePinyinQuery } from "./pinyin";
import { prefixIds } from "./prefix";

const HAN = /[\u3400-\u9fff]/;
const PYHINT = /[1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i;

function hasHan(value: string): boolean {
  return HAN.test(value);
}

function sortCandidates(out: Map<number, SearchCandidate>): SearchCandidate[] {
  // Posting lists are frequency-sorted at build time. A stable sort by rank
  // therefore keeps common headwords in the candidate window.
  return [...out.values()]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 80);
}

function searchChinese(index: SearchIndex, query: string): SearchCandidate[] {
  const out = new Map<number, SearchCandidate>();

  const add = (id: number, match: MatchKind, rank: number) => {
    const existing = out.get(id);
    if (!existing || rank < existing.rank) {
      out.delete(id);
      out.set(id, { id, match, rank });
    }
  };

  for (const id of index.simp[query] ?? []) add(id, "simp", 0);
  for (const id of index.trad[query] ?? []) add(id, "trad", 0.1);

  for (const id of prefixIds(index.keys.simp, index.simp, query, 80)) {
    add(id, "simp", 2);
  }
  for (const id of prefixIds(index.keys.trad, index.trad, query, 80)) {
    add(id, "trad", 2.1);
  }

  if ([...query].length === 1) {
    for (const id of index.char[query] ?? []) add(id, "contains", 3);
  }

  return sortCandidates(out);
}

function searchLatin(index: SearchIndex, query: string): SearchCandidate[] {
  const out = new Map<number, SearchCandidate>();
  const add = (id: number, match: MatchKind, rank: number) => {
    const existing = out.get(id);
    if (!existing || rank < existing.rank) {
      out.delete(id);
      out.set(id, { id, match, rank });
    }
  };

  const lower = query.toLowerCase();
  const pinyinQuery = normalizePinyinQuery(query);
  const looksPinyin = PYHINT.test(query);

  const pinyinRank = looksPinyin ? 0 : 1.2;
  for (const id of index.pinyin[pinyinQuery] ?? []) {
    add(id, "pinyin", pinyinRank);
  }

  if (pinyinQuery.length >= 2) {
    for (const id of prefixIds(index.keys.pinyin, index.pinyin, pinyinQuery, 70)) {
      add(id, "pinyin", 2.4);
    }
  }

  const words = lower.split(/\s+/).filter(Boolean);
  const englishQueries = new Set<string>([lower]);
  for (const word of words) {
    for (const candidate of lemmaCandidates(word)) englishQueries.add(candidate);
  }

  const englishRank = looksPinyin ? 3 : 0.9;
  for (const candidate of englishQueries) {
    const primary = new Set(index.englishPrimary?.[candidate] ?? []);
    for (const id of index.english[candidate] ?? []) {
      add(id, "english", primary.has(id) ? 0.2 : englishRank);
    }
  }

  if (words.length > 1) {
    const sets = words.map((word) => {
      const ids = new Set<number>();
      for (const candidate of lemmaCandidates(word)) {
        for (const id of index.english[candidate] ?? []) ids.add(id);
      }
      return ids;
    });

    if (sets.every((set) => set.size > 0)) {
      const first = [...sets[0]];
      for (const id of first) {
        if (sets.every((set) => set.has(id))) add(id, "english", -0.5);
      }
    }
  }

  for (const candidate of englishQueries) {
    if (candidate.length < 2) continue;
    for (const id of prefixIds(index.keys.english, index.english, candidate, 60)) {
      add(id, "english", 3);
    }
  }

  return sortCandidates(out);
}

export function searchIndex(index: SearchIndex, rawQuery: string): SearchCandidate[] {
  const query = rawQuery.trim();
  if (!query) return [];
  if (hasHan(query)) return searchChinese(index, query.replace(/\s+/g, ""));
  return searchLatin(index, query);
}
