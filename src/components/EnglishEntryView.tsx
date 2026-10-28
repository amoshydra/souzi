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
      onToast("Speech is not available on this device", "error");
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
          <h3>English word not found</h3>
          <p>The English dictionary may not be installed yet. Please try again.</p>
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
        <ArrowLeft size={18} /> Back
      </button>

      <header className="entry-hero en-entry-hero">
        <h1 className={wordClass} lang="en">
          {entry.word}
        </h1>
        {entry.phonetic && (
          <div className="entry-phonetic">/{entry.phonetic}/</div>
        )}

        <div className="entry-actions">
          <button
            type="button"
            className="button button-secondary entry-action"
            onClick={handleSpeak}
            aria-label={`Listen to ${entry.word}`}
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
        <div className="panel-kicker">Chinese meaning</div>
        {entry.translations.length > 0 ? (
          <ol className="definition-list">
            {entry.translations.map((translation, index) => (
              <li key={`${translation}-${index}`}>{translation}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">No meaning is available for this word.</p>
        )}
      </section>

      {entry.definitions.length > 0 && (
        <section className="panel english-definition-panel">
          <details className="english-details">
            <summary>
              More in English
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
        From the English dictionary on this device.
      </p>
    </div>
  );
}
