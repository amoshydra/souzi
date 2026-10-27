import {
  ArrowLeft,
  BookOpen,
  Database,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function AboutView({
  onBack,
  onOpenSettings,
}: {
  onBack: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="page about-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Back to dictionary
      </button>

      <section className="hero about-hero">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          English ↔ Chinese
          <span className="eyebrow-line" />
        </div>
        <h1>
          Every word,
          <br />
          both ways.
        </h1>
        <p className="hero-sub">
          Look up Mandarin by character, pinyin, or English. Works offline,
          with no account.
        </p>
      </section>

      <div className="about-content">
        <section className="panel about-panel">
          <div className="panel-kicker">A dictionary first</div>
          <p>
            Souzi is meant to feel like a dictionary, not a landing page.
            Search is the first thing on the screen, results are ranked for
            learners, and the interface stays out of the way.
          </p>
          <p>
            The English→Chinese core is bundled and installs automatically.
            Chinese→English uses the official CC-CEDICT export, which you
            download from MDBG and import locally.
          </p>
        </section>

        <section className="how-grid">
          <article className="how-card">
            <div className="how-icon">
              <BookOpen size={20} />
            </div>
            <h3>Both directions</h3>
            <p>
              English→Chinese is included. Import CC-CEDICT for full
              Chinese→English coverage.
            </p>
          </article>
          <article className="how-card">
            <div className="how-icon">
              <ShieldCheck size={20} />
            </div>
            <h3>Stays private</h3>
            <p>
              Dictionary files are parsed on this device and never uploaded.
            </p>
          </article>
          <article className="how-card">
            <div className="how-icon">
              <Sparkles size={20} />
            </div>
            <h3>Works offline</h3>
            <p>Once installed, lookups never wait for a network request.</p>
          </article>
        </section>

        <section className="panel about-panel">
          <div className="panel-kicker">Data & licenses</div>
          <p>
            The bundled English core is a filtered 30,000-entry subset of
            ECDICT (MIT). The full ECDICT dataset remains available from its
            project if you want to build a larger core later.
          </p>
          <p>
            CC-CEDICT is licensed CC BY-SA 4.0 and is imported by you. HSK 3.0
            levels and jieba frequency ranks are MIT licensed.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={onOpenSettings}
            >
              <Database size={16} />
              Open data & licenses
            </button>
          </div>
        </section>

        <p className="fine-print">
          Souzi 0.1.0 · No server, no tracking, no account.
        </p>
      </div>
    </div>
  );
}
