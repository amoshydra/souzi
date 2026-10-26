import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Library,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { DictionaryMeta, Entry, HistoryWord, MatchKind, SearchIndex } from "../types";
import { getEntriesByIds, listHistory } from "../lib/db";
import { formatCount, formatDate } from "../lib/format";
import { searchIndex } from "../lib/search";
import { ResultCard } from "./ResultCard";

type Hit = {
  entry: Entry;
  match: MatchKind;
  rank: number;
};

export function SearchPage({
  index,
  meta,
  onOpenEntry,
  onOpenSimp,
  onImport,
}: {
  index: SearchIndex | null;
  meta: DictionaryMeta | null;
  onOpenEntry: (id: number) => void;
  onOpenSimp: (simp: string) => void;
  onImport: () => void;
}) {
  const [query, setQuery] = useState(() => {
    try {
      return sessionStorage.getItem("ciqiao-query") ?? "";
    } catch {
      return "";
    }
  });
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<HistoryWord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef(0);

  const hasQuery = query.trim().length > 0;
  const resultLabel = searching
    ? "Looking…"
    : `${formatCount(hits.length)}${hits.length >= 60 ? "+" : ""} result${
        hits.length === 1 && hits.length < 60 ? "" : "s"
      }`;

  useEffect(() => {
    try {
      sessionStorage.setItem("ciqiao-query", query);
    } catch {
      // Session storage can be unavailable in private modes.
    }
  }, [query]);

  useEffect(() => {
    let active = true;
    listHistory().then((items) => {
      if (active) setHistory(items);
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
      setHits([]);
      setSearching(false);
      return;
    }

    const token = ++tokenRef.current;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      const candidates = searchIndex(index, trimmed);
      const entries = await getEntriesByIds(candidates.map((candidate) => candidate.id));
      if (token !== tokenRef.current) return;

      const byId = new Map(entries.map((entry) => [entry.id, entry]));
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

      const nextHits = candidates.flatMap((candidate) => {
        const entry = byId.get(candidate.id);
        return entry
          ? [{
              entry,
              match: candidate.match,
              rank: candidate.rank + phraseBoost(entry),
            }]
          : [];
      });

      nextHits.sort((a, b) => {
        const lengthA = a.rank >= 2 ? a.entry.simp.length : 0;
        const lengthB = b.rank >= 2 ? b.entry.simp.length : 0;
        return (
          a.rank - b.rank ||
          lengthA - lengthB ||
          (a.entry.frequency ?? 1e9) - (b.entry.frequency ?? 1e9) ||
          (a.entry.hsk ?? 99) - (b.entry.hsk ?? 99) ||
          a.entry.id - b.entry.id
        );
      });

      setHits(nextHits.slice(0, 60));
      setSearching(false);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query, index]);

  const setExample = (value: string) => {
    setQuery(value);
    inputRef.current?.focus();
  };

  return (
    <div className="page search-page">
      {!hasQuery && (
        <section className="hero">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            English ↔ Chinese
            <span className="eyebrow-line" />
          </div>
          <h1>Every word,<br />both ways.</h1>
          <p className="hero-sub">
            Look up Mandarin by character, pinyin, or English. Import once,
            then it works offline.
          </p>
        </section>
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
            {["银行", "nǐ hǎo", "bank", "学习"].map((example) => (
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
            {hits.length > 0 && !searching && (
              <span className="result-caption">Best matches first</span>
            )}
          </div>

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

          {!searching && hits.length === 0 && (
            <div className="empty-card">
              <div className="empty-icon">
                <Search size={22} />
              </div>
              <h3>No entry found</h3>
              <p>
                Try simplified or traditional characters, pinyin with or without
                tones, or a single English word.
              </p>
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
            </div>
          )}

          {!searching && hits.length > 0 && (
            <div className="result-list">
              {hits.map((hit) => (
                <ResultCard
                  key={hit.entry.id}
                  entry={hit.entry}
                  match={hit.match}
                  onOpen={onOpenEntry}
                />
              ))}
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
                  {formatCount(meta.count)} sample words, enough to explore. Add
                  CC-CEDICT to unlock {formatCount(125320)} entries.
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
                <strong>Full dictionary installed</strong>
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
                {history.slice(0, 6).map((item) => (
                  <button
                    type="button"
                    className="history-item"
                    key={item.simp}
                    onClick={() => onOpenSimp(item.simp)}
                  >
                    <span className="hanzi history-hanzi">{item.simp}</span>
                    <span className="history-copy">
                      <span className="pinyin">{item.pinyin}</span>
                      <span className="history-gloss">
                        {item.definitions[0] ?? "View entry"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="how-grid">
            <article className="how-card">
              <div className="how-icon"><BookOpen size={20} /></div>
              <h3>Works offline</h3>
              <p>Once installed, lookups never wait for a network request.</p>
            </article>
            <article className="how-card">
              <div className="how-icon"><ShieldCheck size={20} /></div>
              <h3>Stays private</h3>
              <p>Your dictionary file is parsed on this device and never uploaded.</p>
            </article>
            <article className="how-card">
              <div className="how-icon"><Sparkles size={20} /></div>
              <h3>Yours to keep</h3>
              <p>Import, replace, or remove the data whenever you want.</p>
            </article>
          </section>

          <p className="fine-print">
            Ciqiao does not bundle CC-CEDICT. Download it from MDBG and import it
            locally. The starter set is original sample content.
          </p>
        </div>
      )}
    </div>
  );
}
