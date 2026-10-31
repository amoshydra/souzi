import { useTranslation } from "react-i18next";
import { Star, Trash2 } from "lucide-react";
import type { EnglishSavedWord, UserWord } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

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
  const { t } = useTranslation();
  useDocumentTitle(t("saved.title"));
  const total = favorites.length + englishFavorites.length;

  return (
    <div className="page saved-page">
      <header className="page-heading">
        <div className="section-kicker">{t("saved.kicker")}</div>
        <h1>{t("saved.title")}</h1>
        <p>
          {total > 0
            ? t("saved.count", { count: total })
            : t("saved.headerEmpty")}
        </p>
      </header>

      {total === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">
            <Star size={22} aria-hidden="true" />
          </div>
          <h2>{t("saved.emptyTitle")}</h2>
          <p>{t("saved.emptyBody")}</p>
          <button type="button" className="button button-primary" onClick={onBrowse}>
            {t("saved.findWord")}
          </button>
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <section
              className="saved-group"
              aria-labelledby="saved-chinese-heading"
            >
              <h2
                className="result-group-head"
                id="saved-chinese-heading"
              >
                <span>{t("saved.chineseWords")}</span>
                <span>{favorites.length}</span>
              </h2>
              <div className="saved-list">
                {favorites.map((item) => (
                  <article className="saved-item" key={item.simp}>
                    <button
                      type="button"
                      className="saved-main"
                      onClick={() => onOpenSimp(item.simp)}
                    >
                      <span className="saved-head">
                        <span className="hanzi saved-hanzi" lang="zh-Hans">
                          {item.simp}
                        </span>
                      </span>
                      <span className="pinyin" lang="zh-Latn">
                        {item.pinyin}
                      </span>
                      <span className="gloss" lang="en">
                        {item.definitions.slice(0, 2).join(" · ")}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-small saved-remove"
                      onClick={() => onRemove(item.simp)}
                      aria-label={t("a11y.removeSaved", { word: item.simp })}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                      {t("saved.remove")}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {englishFavorites.length > 0 && (
            <section
              className="saved-group"
              aria-labelledby="saved-english-heading"
            >
              <h2
                className="result-group-head"
                id="saved-english-heading"
              >
                <span>{t("saved.englishWords")}</span>
                <span>{englishFavorites.length}</span>
              </h2>
              <div className="saved-list">
                {englishFavorites.map((item) => (
                  <article className="saved-item" key={item.key}>
                    <button
                      type="button"
                      className="saved-main"
                      onClick={() => onOpenEnglish(item.id)}
                    >
                      <span className="saved-head">
                        <span className="en-word saved-en-word" lang="en">
                          {item.word}
                        </span>
                      </span>
                      <span className="en-phonetic" lang="en">
                        {item.phonetic
                          ? `/${item.phonetic}/`
                          : t("common.english")}
                      </span>
                      <span className="gloss" lang="zh">
                        {item.translations.slice(0, 2).join(" · ")}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-small saved-remove"
                      onClick={() => onRemoveEnglish(item.key)}
                      aria-label={t("a11y.removeSaved", { word: item.word })}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                      {t("saved.remove")}
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
