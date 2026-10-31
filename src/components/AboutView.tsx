import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookOpen,
  Github,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Logo } from "./Logo";

export function AboutView({
  onBack,
  onOpenSettings,
}: {
  onBack: () => void;
  onOpenSettings: () => void;
}) {
  const { t } = useTranslation();
  useDocumentTitle(t("about.pageTitle"));

  return (
    <div className="page about-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
      </button>

      <section className="hero about-hero">
        <div className="eyebrow">
          <span className="eyebrow-line" aria-hidden="true" />
          {t("about.kicker")}
          <span className="eyebrow-line" aria-hidden="true" />
        </div>
        <h1>{t("about.title")}</h1>
        <p className="hero-sub">{t("about.subtitle")}</p>
      </section>

      <div className="about-content">
        <section className="panel about-panel">
          <h2 className="panel-kicker">{t("about.dictionaryFirst")}</h2>
          <p>{t("about.dictionaryFirstBody")}</p>
          <p>{t("about.dictionaryFirstBody2")}</p>
        </section>

        <section className="how-grid" aria-label={t("about.kicker")}>
          <article className="how-card">
            <div className="how-icon">
              <BookOpen size={20} aria-hidden="true" />
            </div>
            <h2>{t("about.twoDirectionsTitle")}</h2>
            <p>{t("about.twoDirectionsBody")}</p>
          </article>
          <article className="how-card">
            <div className="how-icon">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <h2>{t("about.privateTitle")}</h2>
            <p>{t("about.privateBody")}</p>
          </article>
          <article className="how-card">
            <div className="how-icon">
              <Sparkles size={20} aria-hidden="true" />
            </div>
            <h2>{t("about.offlineTitle")}</h2>
            <p>{t("about.offlineBody")}</p>
          </article>
        </section>

        <section className="panel about-panel">
          <h2 className="panel-kicker">{t("about.dataTitle")}</h2>
          <p>{t("about.dataBody")}</p>
          <details className="english-details">
            <summary>{t("about.creditsSummary")}</summary>
            <ul>
              <li>
                {t("about.englishDictionary")}:{" "}
                <a
                  href="https://github.com/skywind3000/ECDICT"
                  target="_blank"
                  rel="noreferrer"
                >
                  ECDICT
                </a>{" "}
                ({t("about.mitLicense")})
              </li>
              <li>
                {t("about.chineseDictionary")}:{" "}
                <a
                  href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC-CEDICT
                </a>{" "}
                (CC BY-SA 4.0)
              </li>
              <li>
                {t("about.wordLevels")}:{" "}
                <a
                  href="https://github.com/ivankra/hsk30"
                  target="_blank"
                  rel="noreferrer"
                >
                  HSK 3.0
                </a>{" "}
                ({t("about.mitLicense")})
              </li>
              <li>
                {t("about.wordFrequency")}:{" "}
                <a
                  href="https://github.com/fxsjy/jieba"
                  target="_blank"
                  rel="noreferrer"
                >
                  jieba
                </a>{" "}
                ({t("about.mitLicense")})
              </li>
              <li>
                {t("about.exampleSentences")}:{" "}
                <a
                  href="https://tatoeba.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  Tatoeba
                </a>{" "}
                (CC BY 2.0 FR)
              </li>
              <li>
                {t("about.relatedWords")}:{" "}
                <a
                  href="https://wordnet.princeton.edu"
                  target="_blank"
                  rel="noreferrer"
                >
                  Princeton WordNet 3.1
                </a>{" "}
                (WordNet License)
              </li>
              <li>
                {t("about.appCode")}:{" "}
                <a
                  href="https://github.com/amoshydra/souzi"
                  target="_blank"
                  rel="noreferrer"
                >
                  Souzi on GitHub
                </a>{" "}
                (
                <a
                  href="https://www.apache.org/licenses/LICENSE-2.0"
                  target="_blank"
                  rel="noreferrer"
                >
                  Apache License 2.0
                </a>
                )
              </li>
            </ul>
          </details>
          <p className="about-source-note">{t("about.sourceNote")}</p>
          <div className="button-row">
            <a
              className="button button-secondary"
              href="https://github.com/amoshydra/souzi"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={18} aria-hidden="true" />
              {t("about.viewGithub")}
            </a>
            <button
              type="button"
              className="button button-secondary"
              onClick={onOpenSettings}
            >
              {t("about.goSettings")}
            </button>
          </div>
        </section>

        <div className="about-brand">
          <Logo size={34} decorative />
          <span>{t("app.name")} {t("app.brandHan")}</span>
        </div>
        <p className="fine-print">
          {t("about.versionLine", { version: __APP_VERSION__ })}
        </p>
      </div>
    </div>
  );
}
