import { Star, Trash2 } from "lucide-react";
import type { UserWord } from "../types";

export function SavedView({
  favorites,
  onOpenSimp,
  onRemove,
  onBrowse,
}: {
  favorites: UserWord[];
  onOpenSimp: (simp: string) => void;
  onRemove: (simp: string) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="page saved-page">
      <header className="page-heading">
        <div className="section-kicker">Your collection</div>
        <h1>Saved words</h1>
        <p>
          {favorites.length > 0
            ? `${favorites.length} word${favorites.length === 1 ? "" : "s"} kept on this device.`
            : "Star a word from its entry to keep it here."}
        </p>
      </header>

      {favorites.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">
            <Star size={22} />
          </div>
          <h3>No saved words yet</h3>
          <p>Open an entry and tap the star. Saved words stay offline.</p>
          <button type="button" className="button button-primary" onClick={onBrowse}>
            Find a word
          </button>
        </div>
      ) : (
        <div className="saved-list">
          {favorites.map((item) => (
            <article className="saved-item" key={item.simp}>
              <button
                type="button"
                className="saved-main"
                onClick={() => onOpenSimp(item.simp)}
              >
                <span className="saved-head">
                  <span className="hanzi saved-hanzi">{item.simp}</span>
                  {item.trad !== item.simp && (
                    <span className="trad-chip">{item.trad}</span>
                  )}
                </span>
                <span className="pinyin">{item.pinyin}</span>
                <span className="gloss">
                  {item.definitions.slice(0, 2).join(" · ")}
                </span>
              </button>
              <button
                type="button"
                className="icon-button saved-remove"
                onClick={() => onRemove(item.simp)}
                aria-label={`Remove ${item.simp} from saved words`}
                title="Remove"
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
