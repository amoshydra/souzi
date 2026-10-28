import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import type {
  EnglishCoreStatus,
  EnglishEntry,
  EnglishHistoryWord,
  EnglishMatchKind,
  EnglishSearchIndex,
  Entry,
  HistoryWord,
  MatchKind,
  SearchIndex,
} from "../types";
import {
  getEnglishEntriesByIds,
  getEntriesByIds,
  listEnglishHistory,
  listHistory,
  removeEnglishHistory,
  removeHistory,
} from "../lib/db";
import {
  englishFrequency,
  searchEnglishIndex,
  suggestEnglishSpellings,
} from "../lib/english";
import { loadExampleQueries } from "../lib/examples";
import { formatCount } from "../lib/format";
import { lemmaCandidates } from "../lib/lemma";
import { searchIndex, suggestPinyinSpellings } from "../lib/search";
import { EnglishResultCard } from "./EnglishResultCard";
import { ResultCard } from "./ResultCard";

type ChineseHit = {
  entry: Entry;
  match: MatchKind;
  rank: number;
};

type EnglishHit = {
  entry: EnglishEntry;
  match: EnglishMatchKind;
  rank: number;
};

type RecentItem =
  | { kind: "zh"; data: HistoryWord }
  | { kind: "en"; data: EnglishHistoryWord };

const HAN = /[\u3400-\u9fff]/;
const TONE_MARK = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i;
const NUMERIC_PINYIN = /^[a-zü:\s]+[1-5][a-zü:\s1-5]*$/i;

export function SearchPage({
  index,
  englishIndex,
  englishStatus,
  onOpenEntry,
  onOpenEnglish,
  onOpenSimp,
  onAbout,
  onToast,
}: {
  index: SearchIndex | null;
  englishIndex: EnglishSearchIndex | null;
  englishStatus: EnglishCoreStatus;
  onOpenEntry: (id: number) => void;
  onOpenEnglish: (id: number) => void;
  onOpenSimp: (simp: string) => void;
  onAbout: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const [query, setQuery] = useState(() => {
    try {
      return sessionStorage.getItem("souzi-query") ?? "";
    } catch {
      return "";
    }
  });
  const [chineseHits, setChineseHits] = useState<ChineseHit[]>([]);
  const [englishHits, setEnglishHits] = useState<EnglishHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchSpinner, setShowSearchSpinner] = useState(false);
  const [history, setHistory] = useState<RecentItem[]>([]);
  const [examples, setExamples] = useState<string[]>([]);
  const [spellingSuggestion, setSpellingSuggestion] = useState<{
    query: string;
    words: string[];
  }>({ query: "", words: [] });
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef(0);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const isHanQuery = HAN.test(trimmedQuery);
  const isPinyinHint =
    TONE_MARK.test(trimmedQuery) || NUMERIC_PINYIN.test(trimmedQuery);
  const isLatinQuery = hasQuery && !isHanQuery && !isPinyinHint;
  const total = chineseHits.length + englishHits.length;
  const spellingSuggestions =
    spellingSuggestion.query === trimmedQuery ? spellingSuggestion.words : [];
  const resultLabel =
    total === 0
      ? "No word found"
      : `${formatCount(total)} ${total === 1 ? "word" : "words"}`;

  useEffect(() => {
    try {
      sessionStorage.setItem("souzi-query", query);
    } catch {
      // Session storage can be unavailable in private modes.
    }
  }, [query]);

  useEffect(() => {
    if (!searching) {
      setShowSearchSpinner(false);
      return;
    }
    const timer = window.setTimeout(() => setShowSearchSpinner(true), 250);
    return () => window.clearTimeout(timer);
  }, [searching]);

  useEffect(() => {
    let active = true;
    setExamples([]);
    void loadExampleQueries(index, englishIndex).then((next) => {
      if (active) setExamples(next);
    });
    return () => {
      active = false;
    };
  }, [index, englishIndex]);

  useEffect(() => {
    let active = true;
    Promise.all([listHistory(), listEnglishHistory()]).then(([zh, en]) => {
      if (!active) return;
      const items: RecentItem[] = [
        ...zh.map((data) => ({ kind: "zh" as const, data })),
        ...en.map((data) => ({ kind: "en" as const, data })),
      ]
        .sort((a, b) => b.data.viewedAt - a.data.viewedAt)
        .slice(0, 6);
      setHistory(items);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || (!index && !englishIndex)) {
      setChineseHits([]);
      setEnglishHits([]);
      setSpellingSuggestion({ query: "", words: [] });
      setSearching(false);
      return;
    }

    const token = ++tokenRef.current;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      const han = HAN.test(trimmed);
      const pinyinHint =
        TONE_MARK.test(trimmed) || NUMERIC_PINYIN.test(trimmed);
      const chineseOnly = han || pinyinHint;
      const chineseCandidates = index ? searchIndex(index, trimmed) : [];
      const englishCandidates =
        !chineseOnly && englishIndex
          ? searchEnglishIndex(englishIndex, trimmed)
          : [];

      const [chineseEntries, englishEntries] = await Promise.all([
        getEntriesByIds(chineseCandidates.map((candidate) => candidate.id)),
        englishCandidates.length > 0
          ? getEnglishEntriesByIds(
              englishCandidates.map((candidate) => candidate.id),
            )
          : Promise.resolve([]),
      ]);
      if (token !== tokenRef.current) return;

      const hasStrongEnglishMatch = englishCandidates.some(
        (candidate) =>
          candidate.match === "word" || candidate.match === "variant",
      );
      const hasStrongPinyinMatch = chineseCandidates.some(
        (candidate) => candidate.match === "pinyin",
      );
      const suggestions = new Set<string>();
      if (!hasStrongEnglishMatch && !hasStrongPinyinMatch) {
        if (englishIndex) {
          for (const suggestion of suggestEnglishSpellings(
            englishIndex,
            trimmed,
          )) {
            suggestions.add(suggestion);
          }
        }
        if (index) {
          for (const suggestion of suggestPinyinSpellings(index, trimmed, 2)) {
            suggestions.add(suggestion);
          }
        }
      }
      setSpellingSuggestion({
        query: trimmed,
        words: [...suggestions].slice(0, 3),
      });

      const normalizedQuery = trimmed.toLowerCase();
      const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
      const definitionText = (entry: Entry) =>
        entry.definitions.join(" ").toLowerCase().replace(/\s+/g, " ");
      const phraseBoost = (entry: Entry): number => {
        const first = entry.definitions[0]?.toLowerCase().trim();
        const definitions = entry.definitions.map((definition) =>
          definition.toLowerCase().trim(),
        );
        if (first === normalizedQuery) return -1;
        if (definitions.some((definition) => definition === normalizedQuery)) {
          return -0.5;
        }
        if (
          queryWords.length > 1 &&
          definitions.some((definition) =>
            definition.includes(normalizedQuery),
          )
        ) {
          return -0.25;
        }
        return 0;
      };
      const matchesEveryWord = (entry: Entry): boolean => {
        const words = new Set(
          definitionText(entry).match(/[a-z][a-z'-]*/g) ?? [],
        );
        return queryWords.every((word) =>
          lemmaCandidates(word).some((candidate) => words.has(candidate)),
        );
      };

      const chineseById = new Map(
        chineseEntries.map((entry) => [entry.id, entry]),
      );
      let nextChinese = chineseCandidates.flatMap((candidate) => {
        const entry = chineseById.get(candidate.id);
        return entry
          ? [
              {
                entry,
                match: candidate.match,
                rank: candidate.rank + phraseBoost(entry),
              },
            ]
          : [];
      });

      // A multi-word lookup is usually a phrase. If any entries match every
      // word, keep those and drop entries that only match one term.
      if (!chineseOnly && queryWords.length > 1) {
        const phraseMatches = nextChinese.filter((hit) =>
          matchesEveryWord(hit.entry),
        );
        if (phraseMatches.length > 0) {
          nextChinese = phraseMatches;
        }
      }

      nextChinese.sort((a, b) => {
        const lengthA = a.rank >= 2 ? a.entry.simp.length : 0;
        const lengthB = b.rank >= 2 ? b.entry.simp.length : 0;
        return (
          a.rank - b.rank ||
          lengthA - lengthB ||
          (a.entry.frequency ?? 1e9) - (b.entry.frequency ?? 1e9) ||
          (a.entry.hsk ?? 99) - (b.entry.hsk ?? 99) ||
          a.entry.simp.length - b.entry.simp.length ||
          a.entry.id - b.entry.id
        );
      });

      const englishById = new Map(
        englishEntries.map((entry) => [entry.id, entry]),
      );
      const nextEnglish = englishCandidates.flatMap((candidate) => {
        const entry = englishById.get(candidate.id);
        return entry
          ? [{ entry, match: candidate.match, rank: candidate.rank }]
          : [];
      });

      nextEnglish.sort(
        (a, b) =>
          a.rank - b.rank ||
          englishFrequency(a.entry) - englishFrequency(b.entry) ||
          a.entry.word.length - b.entry.word.length ||
          a.entry.id - b.entry.id,
      );

      setChineseHits(nextChinese.slice(0, chineseOnly ? 40 : 12));
      setEnglishHits(nextEnglish.slice(0, 10));
      setSearching(false);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query, index, englishIndex]);

  const setExample = (value: string) => {
    setQuery(value);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = async (item: RecentItem) => {
    try {
      if (item.kind === "zh") {
        await removeHistory(item.data.simp);
      } else {
        await removeEnglishHistory(item.data.key);
      }
      setHistory((current) => current.filter((entry) => entry !== item));
      onToast("Removed from recent words");
    } catch {
      onToast("Could not remove recent word", "error");
    }
  };

  const englishLoading = isLatinQuery && englishStatus === "loading";
  const englishError = isLatinQuery && englishStatus === "error";
  const englishMissing = isLatinQuery && englishStatus === "idle";
  const chineseMissing = hasQuery && !index && !isLatinQuery;

  return (
    <div className="page search-page">
      <div className={`search-area ${hasQuery ? "search-area-compact" : ""}`}>
        <div className="search-wrap">
          {showSearchSpinner ? (
            <Loader2
              className="search-icon search-spinner spin"
              size={21}
              aria-hidden="true"
            />
          ) : (
            <Search className="search-icon" size={21} aria-hidden="true" />
          )}
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Look up a word"
            aria-label="Search the dictionary"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            type="search"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {!hasQuery && examples.length > 0 && (
          <div className="search-hint">
            <span className="hint-label">Try</span>
            {examples.map((example) => (
              <button
                type="button"
                className="hint-chip"
                key={example}
                onClick={() => setExample(example)}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasQuery ? (
        <section
          className="results-section"
          aria-live="polite"
          aria-busy={searching}
        >
          <p className="sr-only">{searching ? "" : resultLabel}</p>

          {englishLoading && (
            <div className="english-note">
              <Loader2 size={15} className="spin" />
              Opening the English dictionary…
            </div>
          )}

          {englishError && (
            <div className="english-note english-note-error">
              The English dictionary did not load. Please try again.
            </div>
          )}

          {englishMissing && (
            <div className="english-note">
              The English dictionary is not installed. You can add it in Settings.
            </div>
          )}

          {chineseMissing && (
            <div className="english-note">
              The Chinese dictionary is not installed. You can add it in Settings.
            </div>
          )}

          {!searching && spellingSuggestions.length > 0 && (
            <div className="spelling-hint" role="status">
              <span className="spelling-label">
                {total === 0 ? "No exact match. Did you mean" : "Did you mean"}
              </span>
              <span className="spelling-options">
                {spellingSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    className="hint-chip"
                    key={suggestion}
                    onClick={() => setExample(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </span>
            </div>
          )}

          {!searching &&
            total === 0 &&
            spellingSuggestions.length === 0 && (
            <div className="empty-card">
              <div className="empty-icon">
                <Search size={22} />
              </div>
              <h3>{englishLoading ? "Opening the English dictionary" : "Try another word"}</h3>
              <p>
                {englishLoading
                  ? "The English dictionary is being installed. Please wait."
                  : "Try a Chinese character, an English word, or how the word sounds."}
              </p>
              {!englishLoading && examples.length > 0 && (
                <div className="empty-examples">
                  {examples.map((example) => (
                    <button
                      type="button"
                      className="hint-chip"
                      key={example}
                      onClick={() => setExample(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {englishHits.length > 0 && (
            <div className="result-group">
              <div className="result-group-head">
                <span>English words</span>
                <span>{formatCount(englishHits.length)}</span>
              </div>
              <div className="result-list">
                {englishHits.map((hit) => (
                  <EnglishResultCard
                    key={`en-${hit.entry.id}`}
                    entry={hit.entry}
                    onOpen={onOpenEnglish}
                  />
                ))}
              </div>
            </div>
          )}

          {chineseHits.length > 0 && (
            <div className="result-group">
              <div className="result-group-head">
                <span>Chinese words</span>
                <span>{formatCount(chineseHits.length)}</span>
              </div>
              <div className="result-list">
                {chineseHits.map((hit) => (
                  <ResultCard
                    key={`zh-${hit.entry.id}`}
                    entry={hit.entry}
                    onOpen={onOpenEntry}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="home-sections">
          {history.length > 0 && (
            <section className="home-section">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Recent words</h2>
                </div>

              </div>
              <div className="history-list">
                {history.map((item) => (
                  <div
                    className="history-item"
                    key={
                      item.kind === "zh"
                        ? `zh:${item.data.simp}`
                        : `en:${item.data.key}`
                    }
                  >
                    <button
                      type="button"
                      className="history-main"
                      onClick={() =>
                        item.kind === "zh"
                          ? onOpenSimp(item.data.simp)
                          : onOpenEnglish(item.data.id)
                      }
                    >
                      {item.kind === "zh" ? (
                        <>
                          <span className="hanzi history-hanzi">
                            {item.data.simp}
                          </span>
                          <span className="history-copy">
                            <span className="pinyin">{item.data.pinyin}</span>
                            <span className="history-gloss">
                              {item.data.definitions[0] ?? "View entry"}
                            </span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="en-word history-en-word">
                            {item.data.word}
                          </span>
                          <span className="history-copy">
                            <span className="en-phonetic">
                              {item.data.phonetic
                                ? `/${item.data.phonetic}/`
                                : "English"}
                            </span>
                            <span className="history-gloss">
                              {item.data.translations[0] ?? "View entry"}
                            </span>
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="history-remove"
                      onClick={() => void handleRemoveRecent(item)}
                      aria-label={`Remove ${
                        item.kind === "zh" ? item.data.simp : item.data.word
                      } from recent words`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="home-footer">
            <button type="button" className="text-link" onClick={onAbout}>
              About Souzi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
