import type { Entry, MatchKind } from "../types";

const MATCH_LABEL: Record<MatchKind, string> = {
  simp: "Chinese",
  trad: "Traditional",
  pinyin: "Pinyin",
  english: "English",
  contains: "Contains",
};

export function ResultCard({
  entry,
  match,
  onOpen,
}: {
  entry: Entry;
  match: MatchKind;
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
          {entry.trad !== entry.simp && (
            <span className="trad-chip">{entry.trad}</span>
          )}
          <span className={`match-badge match-${match}`}>{MATCH_LABEL[match]}</span>
          {entry.hsk && <span className="hsk-badge">HSK {entry.hsk}</span>}
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
