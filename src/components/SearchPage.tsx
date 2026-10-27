import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Library,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type {
  DictionaryMeta,
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
} from "../lib/db";
import { englishFrequency, searchEnglishIndex } from "../lib/english";
import { formatCount, formatDate } from "../lib/format";
import { searchIndex } from "../lib/search";
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
  meta,
  onOpenEntry,
  onOpenEnglish,
  onOpenSimp,
  onImport,
  onAbout,
}: {
  index: SearchIndex | null;
  englishIndex: EnglishSearchIndex | null;
  englishStatus: "loading" | "ready" | "error";
  meta: DictionaryMeta | null;
  onOpenEntry: (id: number) => void;
  onOpenEnglish: (id: number) => void;
  onOpenSimp: (simp: string) => void;
  onImport: () => void;
  onAbout: () => void;
}) {
  const [query, setQuery] = useState(() => {
    try {
      return sessionStorage.getItem("ciqiao-query") ?? "";
    } catch {
      return "";
    }
  });
  const [chineseHits, setChineseHits] = useState<ChineseHit[]>([]);
  const [englishHits, setEnglishHits] = useState<EnglishHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef(0);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const isHanQuery = HAN.test(trimmedQuery);
  const isPinyinHint =
    TONE_MARK.test(trimmedQuery) || NUMERIC_PINYIN.test(trimmedQuery);
  const isLatinQuery = hasQuery && !isHanQuery && !isPinyinHint;
  const total = chineseHits.length + englishHits.length;
  const resultLabel = searching
    ? "Looking…"
    : total === 0
      ? "No results"
      : `${formatCount(total)} result${total === 1 ? "" : "s"}`;

  useEffect(() => {
    try {
      sessionStorage.setItem("ciqiao-query", query);
    } catch {
      // Session storage can be unavailable in private modes.
    }
  }, [query]);

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
    if (!index || !trimmed) {
      setChineseHits([]);
      setEnglishHits([]);
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
      const chineseCandidates = searchIndex(index, trimmed);
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

      const normalizedQuery = trimmed.toLowerCase();
      const phraseBoost = (entry: Entry): number => {
        const first = entry.definitions[0]?.toLowerCase().trim();
        if (first === normalizedQuery) return -1;
        if (
          entry.definitions.some(
            (definition) => definition.toLowerCase().trim() === normalizedQuery,
          )
        ) {
          return -0.5;
        }
        return 0;
      };

      const chineseById = new Map(
        chineseEntries.map((entry) => [entry.id, entry]),
      );
      const nextChinese = chineseCandidates.flatMap((candidate) => {
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

  const englishLoading = isLatinQuery && englishStatus === "loading";
  const englishError = isLatinQuery && englishStatus === "error";

  return (
    <div className="page search-page">
      {!hasQuery && (
        <div className="dictionary-head">
          <div>
            <div className="section-kicker">Chinese ↔ English</div>
            <h1 className="dictionary-title">Look up a word</h1>
          </div>
          <p>Character, pinyin, or English</p>
        </div>
      )}

      <div className={`search-area ${hasQuery ? "search-area-compact" : ""}`}>
        <div className="search-wrap">
          <Search className="search-icon" size={21} aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="汉字, pinyin, or English"
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

        {!hasQuery && (
          <div className="search-hint">
            <span className="hint-label">Try</span>
            {["银行", "nǐ hǎo", "bank", "serendipity"].map((example) => (
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
        <section className="results-section" aria-live="polite">
          <div className="section-head">
            <div>
              <div className="section-kicker">Search</div>
              <h2 className="section-title">{resultLabel}</h2>
            </div>
            {total > 0 && !searching && (
              <span className="result-caption">Best matches first</span>
            )}
          </div>

          {englishLoading && (
            <div className="english-note">
              <Loader2 size={15} className="spin" />
              Loading the English–Chinese core…
            </div>
          )}

          {englishError && (
            <div className="english-note english-note-error">
              The bundled English core could not be loaded. English results may
              be unavailable until you reload.
            </div>
          )}

          {searching && (
            <div className="result-list">
              {[0, 1, 2].map((item) => (
                <div className="result-skeleton" key={item}>
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-short" />
                </div>
              ))}
            </div>
          )}

          {!searching && total === 0 && (
            <div className="empty-card">
              <div className="empty-icon">
                <Search size={22} />
              </div>
              <h3>{englishLoading ? "Loading the English dictionary" : "No entry found"}</h3>
              <p>
                {englishLoading
                  ? "The English–Chinese core is being installed. Try again in a moment."
                  : "Try simplified or traditional characters, pinyin with or without tones, or a single English word."}
              </p>
              {!englishLoading && (
                <div className="empty-examples">
                  {["中国", "zhongguo", "hello"].map((example) => (
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

          {!searching && englishHits.length > 0 && (
            <div className="result-group">
              <div className="result-group-head">
                <span>English → Chinese</span>
                <span>{formatCount(englishHits.length)}</span>
              </div>
              <div className="result-list">
                {englishHits.map((hit) => (
                  <EnglishResultCard
                    key={`en-${hit.entry.id}`}
                    entry={hit.entry}
                    match={hit.match}
                    onOpen={onOpenEnglish}
                  />
                ))}
              </div>
            </div>
          )}

          {!searching && chineseHits.length > 0 && (
            <div className="result-group">
              <div className="result-group-head">
                <span>Chinese → English</span>
                <span>{formatCount(chineseHits.length)}</span>
              </div>
              <div className="result-list">
                {chineseHits.map((hit) => (
                  <ResultCard
                    key={`zh-${hit.entry.id}`}
                    entry={hit.entry}
                    match={hit.match}
                    onOpen={onOpenEntry}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="home-sections">
          {meta?.kind === "starter" && (
            <section className="starter-banner">
              <div className="banner-icon">
                <Library size={22} />
              </div>
              <div className="banner-copy">
                <div className="banner-title">You’re using the starter set</div>
                <p>
                  {formatCount(meta.count)} Chinese sample words. Add CC-CEDICT
                  for the full Chinese dictionary; English→Chinese is already
                  included.
                </p>
              </div>
              <button type="button" className="button button-primary" onClick={onImport}>
                <Sparkles size={16} />
                Add dictionary
              </button>
            </section>
          )}

          {meta?.kind === "cedict" && (
            <section className="ready-banner">
              <CheckCircle2 size={20} />
              <div>
                <strong>Full Chinese dictionary installed</strong>
                <span>
                  {formatCount(meta.count)} entries · {formatDate(meta.importedAt)}
                </span>
              </div>
              <span className="status-pill">Offline</span>
            </section>
          )}

          {history.length > 0 && (
            <section className="home-section">
              <div className="section-head">
                <div>
                  <div className="section-kicker">Pick up where you left off</div>
                  <h2 className="section-title">Recent</h2>
                </div>
                <Clock3 size={18} className="section-icon" />
              </div>
              <div className="history-list">
                {history.map((item) =>
                  item.kind === "zh" ? (
                    <button
                      type="button"
                      className="history-item"
                      key={`zh:${item.data.simp}`}
                      onClick={() => onOpenSimp(item.data.simp)}
                    >
                      <span className="hanzi history-hanzi">{item.data.simp}</span>
                      <span className="history-copy">
                        <span className="pinyin">{item.data.pinyin}</span>
                        <span className="history-gloss">
                          {item.data.definitions[0] ?? "View entry"}
                        </span>
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="history-item"
                      key={`en:${item.data.key}`}
                      onClick={() => onOpenEnglish(item.data.id)}
                    >
                      <span className="en-word history-en-word">
                        {item.data.word}
                      </span>
                      <span className="history-copy">
                        <span className="en-phonetic">
                          {item.data.phonetic ? `/${item.data.phonetic}/` : "English"}
                        </span>
                        <span className="history-gloss">
                          {item.data.translations[0] ?? "View entry"}
                        </span>
                      </span>
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          <div className="home-footer">
            <button type="button" className="text-link" onClick={onAbout}>
              About Ciqiao & data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
