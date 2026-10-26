import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Star,
  Volume2,
} from "lucide-react";
import type { EnglishEntry, EnglishSavedWord } from "../types";
import {
  addEnglishHistory,
  getEnglishEntriesByIds,
  toggleEnglishFavorite,
} from "../lib/db";
import { englishTagLabel } from "../lib/english-tags";
import { speakEnglish } from "../lib/speech";

export function EnglishEntryView({
  id,
  favorites,
  onBack,
  onFavoriteChange,
  onToast,
}: {
  id: number;
  favorites: EnglishSavedWord[];
  onBack: () => void;
  onFavoriteChange: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const [entry, setEntry] = useState<EnglishEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEntry(null);

    async function load() {
      const [found] = await getEnglishEntriesByIds([id]);
      if (!active) return;
      setLoading(false);
      if (!found) return;
      setEntry(found);
      void addEnglishHistory(found);
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const starred = entry
    ? favorites.some(
        (favorite) => favorite.key === entry.word.toLowerCase(),
      )
    : false;

  const handleFavorite = async () => {
    if (!entry) return;
    const saved = await toggleEnglishFavorite(entry);
    onFavoriteChange();
    onToast(saved ? "Saved to your words" : "Removed from saved words");
  };

  const handleCopy = async () => {
    if (!entry) return;
    const text = [
      `${entry.word}${entry.phonetic ? ` /${entry.phonetic}/` : ""}`,
      ...entry.translations.map(
        (translation, index) => `${index + 1}. ${translation}`,
      ),
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
    if (!speakEnglish(entry.word)) {
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
          <h3>English entry not found</h3>
          <p>The bundled English core may not be installed yet. Try again in a moment.</p>
        </div>
      </div>
    );
  }

  const wordClass =
    entry.word.length > 24
      ? "entry-word entry-word-long"
      : entry.word.length > 14
        ? "entry-word entry-word-medium"
        : "entry-word";

  return (
    <div className="page entry-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Back to search
      </button>

      <header className="entry-hero en-entry-hero">
        <div className="entry-tools">
          <button
            type="button"
            className="icon-button"
            onClick={handleSpeak}
            aria-label={`Pronounce ${entry.word}`}
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

        <h1 className={wordClass} lang="en">
          {entry.word}
        </h1>
        {entry.phonetic && (
          <div className="entry-phonetic">/{entry.phonetic}/</div>
        )}

        <div className="entry-badges">
          <span className="en-direction-chip">EN → ZH</span>
          {entry.tags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {englishTagLabel(tag)}
            </span>
          ))}
          {entry.collins > 0 && (
            <span className="tag-chip">Collins {entry.collins}</span>
          )}
          {entry.oxford > 0 && <span className="tag-chip">Oxford</span>}
        </div>
      </header>

      <section className="panel definitions-panel">
        <div className="panel-kicker">Chinese</div>
        {entry.translations.length > 0 ? (
          <ol className="definition-list">
            {entry.translations.map((translation, index) => (
              <li key={`${translation}-${index}`}>{translation}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">No Chinese translation is available for this entry.</p>
        )}
      </section>

      {entry.definitions.length > 0 && (
        <section className="panel english-definition-panel">
          <details className="english-details">
            <summary>
              English definition
              <span>{entry.definitions.length}</span>
            </summary>
            <ul>
              {entry.definitions.map((definition, index) => (
                <li key={`${definition}-${index}`}>{definition}</li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <p className="entry-source">
        English core from ECDICT, MIT licensed and bundled as a filtered subset.
      </p>
    </div>
  );
}
