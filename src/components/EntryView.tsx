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

export function EntryView({
  id,
  favorites,
  onBack,
  onOpenEntry,
  onFavoriteChange,
  onToast,
}: {
  id: number;
  favorites: UserWord[];
  onBack: () => void;
  onOpenEntry: (id: number) => void;
  onFavoriteChange: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [characters, setCharacters] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleSpeak = () => {
    if (!entry) return;
    if (!speakChinese(entry.simp)) {
      onToast("Speech is not available in this browser", "error");
    }
  };

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
        <ArrowLeft size={18} /> Back to search
      </button>

      <header className="entry-hero">
        <div className="entry-tools">
          <button
            type="button"
            className="icon-button"
            onClick={handleSpeak}
            aria-label={`Pronounce ${entry.simp}`}
            title="Pronounce"
          >
            <Volume2 size={19} />
          </button>
          <button
            type="button"
            className={`icon-button ${starred ? "starred" : ""}`}
            onClick={handleFavorite}
            aria-label={starred ? "Remove from saved words" : "Save word"}
            title={starred ? "Remove from saved words" : "Save word"}
          >
            <Star size={19} fill={starred ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={handleCopy}
            aria-label="Copy entry"
            title="Copy entry"
          >
            <Copy size={18} />
          </button>
        </div>

        {entry.trad !== entry.simp && (
          <div className="entry-trad" lang="zh-Hant">
            {entry.trad}
          </div>
        )}
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
          {entry.hsk && <span className="hsk-badge">HSK {entry.hsk}</span>}
        </div>
        {entry.source === "starter" && (
          <div className="entry-note">Starter entry · import CC-CEDICT for full coverage</div>
        )}
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
          <p className="muted">No English gloss is available for this entry.</p>
        )}

        {entry.classifiers.length > 0 && (
          <div className="classifier-row">
            <span className="classifier-label">Classifiers</span>
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

      {characters.length > 0 && (
        <section className="character-section">
          <div className="section-head">
            <div>
              <div className="section-kicker">Character by character</div>
              <h2 className="section-title">Build the word</h2>
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
          ? "Definition from CC-CEDICT, imported by you. Licensed CC BY-SA 4.0."
          : "Sample entry written for Souzi."}
      </p>
    </div>
  );
}
