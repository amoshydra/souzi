import { Star, Trash2 } from "lucide-react";
import type { EnglishSavedWord, UserWord } from "../types";

export function SavedView({
  favorites,
  englishFavorites,
  onOpenSimp,
  onOpenEnglish,
  onRemove,
  onRemoveEnglish,
  onBrowse,
}: {
  favorites: UserWord[];
  englishFavorites: EnglishSavedWord[];
  onOpenSimp: (simp: string) => void;
  onOpenEnglish: (id: number) => void;
  onRemove: (simp: string) => void;
  onRemoveEnglish: (key: string) => void;
  onBrowse: () => void;
}) {
  const total = favorites.length + englishFavorites.length;

  return (
    <div className="page saved-page">
      <header className="page-heading">
        <div className="section-kicker">Words you saved</div>
        <h1>Saved words</h1>
        <p>
          {total > 0
            ? `${total} word${total === 1 ? "" : "s"} kept on this device.`
            : "Tap Save on a word to keep it here."}
        </p>
      </header>

      {total === 0 ? (
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
        <>
          {favorites.length > 0 && (
            <section className="saved-group">
              <div className="result-group-head">
                <span>Chinese words</span>
                <span>{favorites.length}</span>
              </div>
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
                      </span>
                      <span className="pinyin">{item.pinyin}</span>
                      <span className="gloss">
                        {item.definitions.slice(0, 2).join(" · ")}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-small saved-remove"
                      onClick={() => onRemove(item.simp)}
                      aria-label={`Remove ${item.simp} from saved words`}
                    >
                      <Trash2 size={17} />
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {englishFavorites.length > 0 && (
            <section className="saved-group">
              <div className="result-group-head">
                <span>English words</span>
                <span>{englishFavorites.length}</span>
              </div>
              <div className="saved-list">
                {englishFavorites.map((item) => (
                  <article className="saved-item" key={item.key}>
                    <button
                      type="button"
                      className="saved-main"
                      onClick={() => onOpenEnglish(item.id)}
                    >
                      <span className="saved-head">
                        <span className="en-word saved-en-word">{item.word}</span>
                      </span>
                      <span className="en-phonetic">
                        {item.phonetic ? `/${item.phonetic}/` : "English"}
                      </span>
                      <span className="gloss">
                        {item.translations.slice(0, 2).join(" · ")}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-small saved-remove"
                      onClick={() => onRemoveEnglish(item.key)}
                      aria-label={`Remove ${item.word} from saved words`}
                    >
                      <Trash2 size={17} />
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
