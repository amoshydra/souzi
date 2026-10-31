import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Star,
  Volume2,
} from "lucide-react";
import type {
  EnglishEntry,
  EnglishSavedWord,
  ExampleSentence,
  RelatedWordGroups,
} from "../types";
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
} from "../lib/example-sentences";
import { loadRelatedWords, relatedWordsFor } from "../lib/related";
import { getRelatedPackMeta } from "../lib/related-pack";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { translateError } from "../i18n/errors";
import { ExampleAttribution } from "./ExampleAttribution";

type RelatedSource = { source: string; license: string } | null;

export function EnglishEntryView({
  id,
  favorites,
  fullEnglish,
  onBack,
  onOpenWord,
  onFavoriteChange,
  onToast,
}: {
  id: number;
  favorites: EnglishSavedWord[];
  fullEnglish: boolean;
  onBack: () => void;
  onOpenWord: (word: string) => void;
  onFavoriteChange: () => void;
  onToast: (message: string, tone?: "default" | "error") => void;
}) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [entry, setEntry] = useState<EnglishEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);
  const [related, setRelated] = useState<RelatedWordGroups>({});
  const [relatedSource, setRelatedSource] = useState<RelatedSource>(null);

  useDocumentTitle(entry?.word);

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
    onToast(
      saved ? t("entry.savedToast") : t("entry.removedSavedToast"),
    );
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
      onToast(t("entry.copied"));
    } catch {
      onToast(t("entry.copyFailed"), "error");
    }
  };

  const handleSpeak = async () => {
    if (!entry) return;
    const result = await speakEnglish(entry.word);
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
    void loadExampleSentences("en").then((map) => {
      if (active) setExamples(exampleSentencesFor(map, entry.word));
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
    void Promise.all([loadRelatedWords("en"), getRelatedPackMeta()]).then(
      ([map, meta]) => {
        if (!active) return;
        setRelated(relatedWordsFor(map, entry.word));
        setRelatedSource(
          meta ? { source: meta.source, license: meta.license } : null,
        );
      },
    );
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
        <h1 className="sr-only">{t("entry.englishNotFound")}</h1>
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
        </button>
        <div className="empty-card">
          <h2>{t("entry.englishNotFound")}</h2>
          <p>{t("entry.englishNotFoundBody")}</p>
        </div>
      </div>
    );
  }

  const relatedGroups = [
    { label: t("entry.synonyms"), words: related.synonyms ?? [] },
    { label: t("entry.antonyms"), words: related.antonyms ?? [] },
    { label: t("entry.related"), words: related.related ?? [] },
  ].filter((group) => group.words.length > 0);

  const wordClass =
    entry.word.length > 24
      ? "entry-word entry-word-long"
      : entry.word.length > 14
        ? "entry-word entry-word-medium"
        : "entry-word";

  return (
    <div className="page entry-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
      </button>

      <header className="entry-hero en-entry-hero">
        <h1 ref={headingRef} className={wordClass} lang="en">
          {entry.word}
        </h1>
        {entry.phonetic && (
          <div className="entry-phonetic" lang="en">
            <span className="sr-only">{t("entry.pronunciation")} </span>
            <span aria-hidden="true">/</span>
            {entry.phonetic}
            <span aria-hidden="true">/</span>
          </div>
        )}

        <div className="entry-actions">
          <button
            type="button"
            className="button button-secondary entry-action"
            onClick={handleSpeak}
            aria-label={t("a11y.listenTo", { word: entry.word })}
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
        aria-labelledby="chinese-meaning-heading"
      >
        <h2 className="panel-kicker" id="chinese-meaning-heading">
          {t("entry.chineseMeaning")}
        </h2>
        {entry.translations.length > 0 ? (
          <ol className="definition-list" lang="zh">
            {entry.translations.map((translation, index) => (
              <li key={`${translation}-${index}`}>{translation}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">{t("entry.noMeaning")}</p>
        )}
      </section>

      {entry.definitions.length > 0 && (
        <section
          className="panel english-definition-panel"
          aria-labelledby="more-english-heading"
        >
          <h2 className="panel-kicker" id="more-english-heading">
            {t("entry.moreInEnglish")}
          </h2>
          <ul lang="en">
            {entry.definitions.map((definition, index) => (
              <li key={`${definition}-${index}`}>{definition}</li>
            ))}
          </ul>
        </section>
      )}

      {exchangeForms(entry.exchange).length > 0 && (
        <section className="panel forms-panel" aria-labelledby="forms-heading">
          <h2 className="panel-kicker" id="forms-heading">
            {t("entry.forms")}
          </h2>
          <div className="form-chips">
            {exchangeForms(entry.exchange)
              .filter((form) => form !== entry.word.toLowerCase())
              .map((form) => (
                <button
                  type="button"
                  className="form-chip form-chip-button"
                  key={form}
                  lang="en"
                  onClick={() => onOpenWord(form)}
                >
                  {form}
                </button>
              ))}
          </div>
        </section>
      )}

      {examples.length > 0 && (
        <section className="panel examples-panel" aria-labelledby="examples-heading">
          <h2 className="panel-kicker" id="examples-heading">
            {t("entry.examples")}
          </h2>
          <ul className="example-list">
            {examples.map((example, index) => (
              <li className="example-item" key={`${example.text}-${index}`}>
                <p className="example-text" lang="en">
                  {example.text}
                </p>
                <p className="example-translation" lang="zh">
                  {example.translation}
                </p>
              </li>
            ))}
          </ul>
          <ExampleAttribution examples={examples} />
        </section>
      )}

      {relatedGroups.length > 0 && (
        <section
          className="panel related-panel"
          aria-labelledby="related-heading"
        >
          <h2 className="panel-kicker" id="related-heading">
            {t("entry.relatedWords")}
          </h2>
          <div className="related-groups">
            {relatedGroups.map((group) => (
              <div className="related-group" key={group.label}>
                <span className="related-label">{group.label}</span>
                <div className="form-chips">
                  {group.words.map((word) => (
                    <button
                      type="button"
                      className="form-chip form-chip-button"
                      key={`${group.label}-${word}`}
                      lang="en"
                      onClick={() => onOpenWord(word)}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="content-attribution">
            {relatedSource
              ? t("entry.relatedSource", {
                  source: relatedSource.source,
                  license: relatedSource.license,
                })
              : t("entry.starterRelatedWords")}
          </p>
        </section>
      )}

      <p className="entry-source">
        {t("entry.fromEnglishDictionary")}
      </p>
    </div>
  );
}
