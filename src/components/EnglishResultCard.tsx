import type { EnglishEntry, EnglishMatchKind } from "../types";
import { englishTagLabel } from "../lib/english-tags";

const MATCH_LABEL: Record<EnglishMatchKind, string> = {
  word: "English",
  variant: "Word form",
  lemma: "Base form",
  prefix: "Prefix",
};

export function EnglishResultCard({
  entry,
  match,
  onOpen,
}: {
  entry: EnglishEntry;
  match: EnglishMatchKind;
  onOpen: (id: number) => void;
}) {
  const visibleTranslations = entry.translations.slice(0, 2);
  const remaining = entry.translations.length - visibleTranslations.length;
  const visibleTags = entry.tags.slice(0, 2);

  return (
    <button
      type="button"
      className="result-card en-result-card"
      onClick={() => onOpen(entry.id)}
      aria-label={`Open English entry ${entry.word}`}
    >
      <span className="result-card-main">
        <span className="result-card-top">
          <span className="en-word">{entry.word}</span>
          <span className="match-badge match-english">EN → ZH</span>
          {visibleTags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {englishTagLabel(tag)}
            </span>
          ))}
        </span>
        {entry.phonetic && (
          <span className="en-phonetic">/{entry.phonetic}/</span>
        )}
        <span className="gloss">
          {visibleTranslations.join(" · ")}
          {remaining > 0 ? ` · +${remaining}` : ""}
        </span>
        <span className="en-match-kind">{MATCH_LABEL[match]}</span>
      </span>
      <span className="result-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
