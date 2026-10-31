import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Star,
  Volume2,
} from "lucide-react";
import type { Entry, RelatedWordGroups, UserWord } from "../types";
import { addHistory, getEntriesByIds, getEntryBySimp, toggleFavorite } from "../lib/db";
import { speakChinese } from "../lib/speech";
import {
  loadExampleSentences,
  exampleSentencesFor,
} from "../lib/example-sentences";
import { loadRelatedWords, relatedWordsFor } from "../lib/related";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { translateError } from "../i18n/errors";
import { ExampleAttribution } from "./ExampleAttribution";

export function EntryView({
  id,
  favorites,
  onBack,
  onOpenEntry,
  onOpenSimp,
  onFavoriteChange,
  onToast,
}: {
  id: number;
  favorites: UserWord[];
  onBack: () => void;
  onOpenEntry: (id: number) => void;
  onOpenSimp: (simp: string) => void;
  onFavoriteChange: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [characters, setCharacters] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [examples, setExamples] = useState<
    { text: string; translation: string; source?: string }[]
  >([]);
  const [related, setRelated] = useState<RelatedWordGroups>({});

  useDocumentTitle(entry?.simp);

  useEffect(() => {
    if (!entry) return;
    const heading = headingRef.current;
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [entry]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEntry(null);
    setCharacters([]);

    async function load() {
      const [found] = await getEntriesByIds([id]);
      if (!active) return;
      if (!found) {
        setLoading(false);
        return;
      }

      setEntry(found);
      setLoading(false);
      void addHistory(found);

      const uniqueCharacters = [...new Set([...found.simp])].slice(0, 6);
      const characterEntries = await Promise.all(
        uniqueCharacters.map((character) => getEntryBySimp(character)),
      );
      if (!active) return;
      setCharacters(
        characterEntries.filter(
          (item): item is Entry => Boolean(item) && item!.id !== found.id,
        ),
      );
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const starred = entry
    ? favorites.some((favorite) => favorite.simp === entry.simp)
    : false;

  const handleFavorite = async () => {
    if (!entry) return;
    const saved = await toggleFavorite(entry);
    onFavoriteChange();
    onToast(
      saved ? t("entry.savedToast") : t("entry.removedSavedToast"),
    );
  };

  const handleCopy = async () => {
    if (!entry) return;
    const text = [
      `${entry.simp}${entry.trad !== entry.simp ? ` (${entry.trad})` : ""}`,
      `[${entry.pinyin}]`,
      ...entry.definitions.map((definition, index) => `${index + 1}. ${definition}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      onToast(t("entry.copied"));
    } catch {
      onToast(t("entry.copyFailed"), "error");
    }
  };

  const handleSpeak = async () => {
    if (!entry) return;
    const result = await speakChinese(entry.simp);
    if (!result.ok) {
      onToast(translateError(t, result.error), "error");
    }
  };

  useEffect(() => {
    if (!entry) {
      setExamples([]);
      return;
    }
    let active = true;
    void loadExampleSentences("zh").then((map) => {
      if (active) setExamples(exampleSentencesFor(map, entry.simp));
    });
    return () => {
      active = false;
    };
  }, [entry]);

  useEffect(() => {
    if (!entry) {
      setRelated({});
      return;
    }
    let active = true;
    void loadRelatedWords("zh").then((map) => {
      if (active) setRelated(relatedWordsFor(map, entry.simp));
    });
    return () => {
      active = false;
    };
  }, [entry]);

  if (loading) {
    return (
      <div className="page entry-page">
        <h1 className="sr-only">{t("entry.opening")}</h1>
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
        </button>
        <div className="entry-loading" role="status">
          <Loader2 className="spin" size={24} aria-hidden="true" />
          <span>{t("entry.opening")}</span>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="page entry-page">
        <h1 className="sr-only">{t("entry.notFound")}</h1>
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
        </button>
        <div className="empty-card">
          <h2>{t("entry.notFound")}</h2>
          <p>{t("entry.notFoundBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page entry-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
      </button>

      <header className="entry-hero">
        <h1
          ref={headingRef}
          className={`entry-hanzi ${
            entry.simp.length > 8
              ? "entry-hanzi-long"
              : entry.simp.length > 4
                ? "entry-hanzi-medium"
                : ""
          }`}
          lang="zh-Hans"
        >
          {entry.simp}
        </h1>
        <div className="entry-meta">
          <span className="entry-pinyin" lang="zh-Latn">
            {entry.pinyin}
          </span>
        </div>
        {entry.trad !== entry.simp && (
          <div className="entry-also">
            <Trans
              i18nKey="entry.alsoWritten"
              values={{ traditional: entry.trad }}
              components={{ trad: <span lang="zh-Hant" /> }}
            />
          </div>
        )}
        {entry.source === "starter" && (
          <div className="entry-note">{t("entry.sampleWord")}</div>
        )}

        <div className="entry-actions">
          <button
            type="button"
            className="button button-secondary entry-action"
            onClick={handleSpeak}
            aria-label={t("a11y.listenTo", { word: entry.simp })}
          >
            <Volume2 size={19} aria-hidden="true" />
            <span>{t("entry.listen")}</span>
          </button>
          <button
            type="button"
            className={`button button-secondary entry-action ${
              starred ? "entry-action-saved" : ""
            }`}
            onClick={handleFavorite}
            aria-label={
              starred ? t("a11y.savedRemove") : t("a11y.saveWord")
            }
            aria-pressed={starred}
          >
            <Star
              size={19}
              fill={starred ? "currentColor" : "none"}
              aria-hidden="true"
            />
            <span>{starred ? t("entry.saved") : t("entry.save")}</span>
          </button>
          <button
            type="button"
            className="button button-secondary entry-action"
            onClick={handleCopy}
            aria-label={t("a11y.copyWord")}
          >
            <Copy size={18} aria-hidden="true" />
            <span>{t("entry.copy")}</span>
          </button>
        </div>
      </header>

      <section
        className="panel definitions-panel"
        aria-labelledby="meaning-heading"
      >
        <h2 className="panel-kicker" id="meaning-heading">
          {t("entry.meaning")}
        </h2>
        {entry.definitions.length > 0 ? (
          <ol className="definition-list" lang="en">
            {entry.definitions.map((definition, index) => (
              <li key={`${definition}-${index}`}>{definition}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">{t("entry.noMeaning")}</p>
        )}

        {entry.classifiers.length > 0 && (
          <div className="classifier-row">
            <span className="classifier-label">
              {t("entry.countingWord")}
            </span>
            <div className="classifier-chips">
              {entry.classifiers.map((classifier) => (
                <span
                  className="classifier-chip"
                  key={classifier}
                  lang="zh"
                >
                  {classifier}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {examples.length > 0 && (
        <section className="panel examples-panel" aria-labelledby="examples-heading">
          <h2 className="panel-kicker" id="examples-heading">
            {t("entry.examples")}
          </h2>
          <ul className="example-list">
            {examples.map((example, index) => (
              <li className="example-item" key={`${example.text}-${index}`}>
                <p className="example-text" lang="zh">
                  {example.text}
                </p>
                <p className="example-translation" lang="en">
                  {example.translation}
                </p>
              </li>
            ))}
          </ul>
          <ExampleAttribution examples={examples} />
        </section>
      )}

      {(related.related?.length ?? 0) > 0 && (
        <section
          className="panel related-panel"
          aria-labelledby="related-heading"
        >
          <h2 className="panel-kicker" id="related-heading">
            {t("entry.relatedWords")}
          </h2>
          <div className="form-chips">
            {(related.related ?? []).map((word) => (
              <button
                type="button"
                className="form-chip form-chip-button"
                key={word}
                lang="zh"
                onClick={() => onOpenSimp(word)}
              >
                {word}
              </button>
            ))}
          </div>
          <p className="content-attribution">
            {t("entry.starterRelatedWords")}
          </p>
        </section>
      )}

      {characters.length > 0 && (
        <section
          className="character-section"
          aria-labelledby="characters-heading"
        >
          <div className="section-head">
            <div>
              <div className="section-kicker">{t("entry.eachCharacter")}</div>
              <h2 className="section-title" id="characters-heading">
                {t("entry.characterMeanings")}
              </h2>
            </div>
          </div>
          <div className="char-grid">
            {characters.map((character) => (
              <button
                type="button"
                className="char-card"
                key={character.id}
                onClick={() => onOpenEntry(character.id)}
              >
                <span className="char-glyph" lang="zh-Hans">
                  {character.simp}
                </span>
                <span className="char-pinyin" lang="zh-Latn">
                  {character.pinyin}
                </span>
                <span className="char-gloss" lang="en">
                  {character.definitions[0] ?? t("common.viewEntry")}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="entry-source">
        {entry.source === "cedict"
          ? t("entry.fromChineseDictionary")
          : t("entry.sampleSource")}
      </p>
    </div>
  );
}
