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
import { getFullEnglishEntriesByIds } from "../lib/full-english";
import { speakEnglish } from "../lib/speech";
import {
  loadExampleSentences,
  exampleSentencesFor,
  exchangeForms,
  type ExampleSentence,
} from "../lib/example-sentences";
import { loadRelatedWords, relatedWordsFor } from "../lib/related";

export function EnglishEntryView({
  id,
  favorites,
  fullEnglish,
  onBack,
  onFavoriteChange,
  onToast,
}: {
  id: number;
  favorites: EnglishSavedWord[];
  fullEnglish: boolean;
  onBack: () => void;
  onFavoriteChange: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const [entry, setEntry] = useState<EnglishEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);
  const [related, setRelated] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEntry(null);

    async function load() {
      const [found] = fullEnglish
        ? await getFullEnglishEntriesByIds([id])
        : await getEnglishEntriesByIds([id]);
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
  }, [id, fullEnglish]);

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

  const handleSpeak = async () => {
    if (!entry) return;
    const result = await speakEnglish(entry.word);
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
    void loadExampleSentences("en").then((map) => {
      if (active) setExamples(exampleSentencesFor(map, entry.word));
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
    void loadRelatedWords("en").then((map) => {
      if (active) setRelated(relatedWordsFor(map, entry.word));
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
          <div className="panel-kicker">More in English</div>
          <ul>
            {entry.definitions.map((definition, index) => (
              <li key={`${definition}-${index}`}>{definition}</li>
            ))}
          </ul>
        </section>
      )}

      {exchangeForms(entry.exchange).length > 0 && (
        <section className="panel forms-panel">
          <div className="panel-kicker">Forms</div>
          <div className="form-chips">
            {exchangeForms(entry.exchange)
              .filter((form) => form !== entry.word.toLowerCase())
              .map((form) => (
                <span className="form-chip" key={form}>
                  {form}
                </span>
              ))}
          </div>
        </section>
      )}

      {examples.length > 0 && (
        <section className="panel examples-panel">
          <div className="panel-kicker">Examples</div>
          <ul className="example-list">
            {examples.map((example, index) => (
              <li className="example-item" key={`${example.text}-${index}`}>
                <p className="example-text">{example.text}</p>
                <p className="example-translation">{example.translation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="panel related-panel">
          <div className="panel-kicker">Related words</div>
          <div className="form-chips">
            {related.map((word) => (
              <span className="form-chip" key={word}>
                {word}
              </span>
            ))}
          </div>
        </section>
      )}

      <p className="entry-source">
        From the English dictionary on this device.
      </p>
    </div>
  );
}
