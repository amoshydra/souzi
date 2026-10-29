import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Star,
  Volume2,
} from "lucide-react";
import type { Entry, UserWord } from "../types";
import { addHistory, getEntriesByIds, getEntryBySimp, toggleFavorite } from "../lib/db";
import { speakChinese } from "../lib/speech";
import {
  loadExampleSentences,
  exampleSentencesFor,
  exampleAttribution,
} from "../lib/example-sentences";
import { loadRelatedWords, relatedWordsFor } from "../lib/related";

export function EntryView({
  id,
  favorites,
  onBack,
  onOpenEntry,
  onOpenSimp,
  onFavoriteChange,
  onToast,
}: {
  id: number;
  favorites: UserWord[];
  onBack: () => void;
  onOpenEntry: (id: number) => void;
  onOpenSimp: (simp: string) => void;
  onFavoriteChange: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [characters, setCharacters] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [examples, setExamples] = useState<
    { text: string; translation: string; source?: string }[]
  >([]);
  const [related, setRelated] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEntry(null);
    setCharacters([]);

    async function load() {
      const [found] = await getEntriesByIds([id]);
      if (!active) return;
      if (!found) {
        setLoading(false);
        return;
      }

      setEntry(found);
      setLoading(false);
      void addHistory(found);

      const uniqueCharacters = [...new Set([...found.simp])].slice(0, 6);
      const characterEntries = await Promise.all(
        uniqueCharacters.map((character) => getEntryBySimp(character)),
      );
      if (!active) return;
      setCharacters(
        characterEntries.filter(
          (item): item is Entry => Boolean(item) && item!.id !== found.id,
        ),
      );
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const starred = entry
    ? favorites.some((favorite) => favorite.simp === entry.simp)
    : false;

  const handleFavorite = async () => {
    if (!entry) return;
    const saved = await toggleFavorite(entry);
    onFavoriteChange();
    onToast(saved ? "Saved to your words" : "Removed from saved words");
  };

  const handleCopy = async () => {
    if (!entry) return;
    const text = [
      `${entry.simp}${entry.trad !== entry.simp ? ` (${entry.trad})` : ""}`,
      `[${entry.pinyin}]`,
      ...entry.definitions.map((definition, index) => `${index + 1}. ${definition}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      onToast("Copied entry");
    } catch {
      onToast("Could not copy", "error");
    }
  };

  const handleSpeak = async () => {
    if (!entry) return;
    const result = await speakChinese(entry.simp);
    if (!result.ok) {
      onToast(result.reason ?? "Speech is not available on this device", "error");
    }
  };

  useEffect(() => {
    if (!entry) {
      setExamples([]);
      return;
    }
    let active = true;
    void loadExampleSentences("zh").then((map) => {
      if (active) setExamples(exampleSentencesFor(map, entry.simp));
    });
    return () => {
      active = false;
    };
  }, [entry]);

  useEffect(() => {
    if (!entry) {
      setRelated([]);
      return;
    }
    let active = true;
    void loadRelatedWords("zh").then((map) => {
      if (active) setRelated(relatedWordsFor(map, entry.simp));
    });
    return () => {
      active = false;
    };
  }, [entry]);

  if (loading) {
    return (
      <div className="page entry-page">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="entry-loading">
          <Loader2 className="spin" size={24} />
          <span>Opening entry…</span>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="page entry-page">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="empty-card">
          <h3>Entry not found</h3>
          <p>The dictionary may have been replaced. Search again to find it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page entry-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>

      <header className="entry-hero">
        <h1
          className={`entry-hanzi ${
            entry.simp.length > 8
              ? "entry-hanzi-long"
              : entry.simp.length > 4
                ? "entry-hanzi-medium"
                : ""
          }`}
          lang="zh-Hans"
        >
          {entry.simp}
        </h1>
        <div className="entry-meta">
          <span className="entry-pinyin">{entry.pinyin}</span>
        </div>
        {entry.trad !== entry.simp && (
          <div className="entry-also">
            Also written <span lang="zh-Hant">{entry.trad}</span>
          </div>
        )}
        {entry.source === "starter" && (
          <div className="entry-note">Sample word</div>
        )}

        <div className="entry-actions">
          <button
            type="button"
            className="button button-secondary entry-action"
            onClick={handleSpeak}
            aria-label={`Listen to ${entry.simp}`}
          >
            <Volume2 size={19} />
            <span>Listen</span>
          </button>
          <button
            type="button"
            className={`button button-secondary entry-action ${
              starred ? "entry-action-saved" : ""
            }`}
            onClick={handleFavorite}
            aria-label={starred ? "Remove from saved words" : "Save word"}
          >
            <Star size={19} fill={starred ? "currentColor" : "none"} />
            <span>{starred ? "Saved" : "Save"}</span>
          </button>
          <button
            type="button"
            className="button button-secondary entry-action"
            onClick={handleCopy}
            aria-label="Copy word"
          >
            <Copy size={18} />
            <span>Copy</span>
          </button>
        </div>
      </header>

      <section className="panel definitions-panel">
        <div className="panel-kicker">Meaning</div>
        {entry.definitions.length > 0 ? (
          <ol className="definition-list">
            {entry.definitions.map((definition, index) => (
              <li key={`${definition}-${index}`}>{definition}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">No meaning is available for this word.</p>
        )}

        {entry.classifiers.length > 0 && (
          <div className="classifier-row">
            <span className="classifier-label">Counting word</span>
            <div className="classifier-chips">
              {entry.classifiers.map((classifier) => (
                <span className="classifier-chip" key={classifier} lang="zh">
                  {classifier}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {examples.length > 0 && (
        <section className="panel examples-panel">
          <div className="panel-kicker">Examples</div>
          <ul className="example-list">
            {examples.map((example, index) => (
              <li className="example-item" key={`${example.text}-${index}`}>
                <p className="example-text" lang="zh">
                  {example.text}
                </p>
                <p className="example-translation">{example.translation}</p>
              </li>
            ))}
          </ul>
          <p className="content-attribution">{exampleAttribution(examples)}</p>
        </section>
      )}

      {related.length > 0 && (
        <section className="panel related-panel">
          <div className="panel-kicker">Related words</div>
          <div className="form-chips">
            {related.map((word) => (
              <button
                type="button"
                className="form-chip form-chip-button"
                key={word}
                lang="zh"
                onClick={() => onOpenSimp(word)}
              >
                {word}
              </button>
            ))}
          </div>
          <p className="content-attribution">Starter related words</p>
        </section>
      )}

      {characters.length > 0 && (
        <section className="character-section">
          <div className="section-head">
            <div>
              <div className="section-kicker">Each character</div>
              <h2 className="section-title">Character meanings</h2>
            </div>
          </div>
          <div className="char-grid">
            {characters.map((character) => (
              <button
                type="button"
                className="char-card"
                key={character.id}
                onClick={() => onOpenEntry(character.id)}
              >
                <span className="char-glyph" lang="zh">{character.simp}</span>
                <span className="char-pinyin">{character.pinyin}</span>
                <span className="char-gloss">
                  {character.definitions[0] ?? "View entry"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="entry-source">
        {entry.source === "cedict"
          ? "From the Chinese dictionary on this device."
          : "Sample word."}
      </p>
    </div>
  );
}
