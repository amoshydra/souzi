import type { Entry } from "../types";

export function ResultCard({
  entry,
  onOpen,
}: {
  entry: Entry;
  onOpen: (id: number) => void;
}) {
  const visibleDefinitions = entry.definitions.slice(0, 2);
  const remaining = entry.definitions.length - visibleDefinitions.length;

  return (
    <button
      type="button"
      className="result-card"
      onClick={() => onOpen(entry.id)}
      aria-label={`Open ${entry.simp}, ${entry.pinyin}`}
    >
      <span className="result-card-main">
        <span className="result-card-top">
          <span className="hanzi result-hanzi">{entry.simp}</span>
        </span>
        <span className="pinyin">{entry.pinyin}</span>
        <span className="gloss">
          {visibleDefinitions.join(" · ")}
          {remaining > 0 ? ` · +${remaining}` : ""}
        </span>
      </span>
      <span className="result-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
