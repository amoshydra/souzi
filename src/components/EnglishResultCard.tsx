import type { EnglishEntry } from "../types";

export function EnglishResultCard({
  entry,
  onOpen,
}: {
  entry: EnglishEntry;
  onOpen: (id: number) => void;
}) {
  const visibleTranslations = entry.translations.slice(0, 2);
  const remaining = entry.translations.length - visibleTranslations.length;

  return (
    <button
      type="button"
      className="result-card en-result-card"
      onClick={() => onOpen(entry.id)}
      aria-label={`Open English entry ${entry.word}`}
    >
      <span className="result-card-main">
        <span className="result-card-top">
          <span className="en-word" lang="en">
            {entry.word}
          </span>
        </span>
        {entry.phonetic && (
          <span className="en-phonetic">/{entry.phonetic}/</span>
        )}
        <span className="gloss">
          {visibleTranslations.join(" · ")}
          {remaining > 0 ? ` · +${remaining}` : ""}
        </span>
      </span>
      <span className="result-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
