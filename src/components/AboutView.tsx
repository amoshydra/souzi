import {
  ArrowLeft,
  BookOpen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "./Logo";

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
          A simple dictionary for English and Chinese, made to be easy to read
          and easy to use.
        </p>
      </section>

      <div className="about-content">
        <section className="panel about-panel">
          <div className="panel-kicker">A dictionary first</div>
          <p>
            Search is the first thing you see. Type a Chinese or English word
            and tap the result to read the meaning.
          </p>
          <p>
            Your dictionaries are saved on this device. There is no account and
            no sign-in. After setup, Souzi works without internet.
          </p>
        </section>

        <section className="how-grid">
          <article className="how-card">
            <div className="how-icon">
              <BookOpen size={20} />
            </div>
            <h3>Two directions</h3>
            <p>Look up English words and Chinese words in the same app.</p>
          </article>
          <article className="how-card">
            <div className="how-icon">
              <ShieldCheck size={20} />
            </div>
            <h3>Private</h3>
            <p>Your words stay on your device. Nothing is sent to a server.</p>
          </article>
          <article className="how-card">
            <div className="how-icon">
              <Sparkles size={20} />
            </div>
            <h3>Works offline</h3>
            <p>Once your dictionaries are installed, you do not need internet.</p>
          </article>
        </section>

        <section className="panel about-panel">
          <div className="panel-kicker">Data and credits</div>
          <p>
            The English dictionary is included with Souzi. The Chinese
            dictionary is downloaded when you set up the app.
          </p>
          <details className="english-details">
            <summary>Data credits and licenses</summary>
            <ul>
              <li>
                English dictionary:{" "}
                <a
                  href="https://github.com/skywind3000/ECDICT"
                  target="_blank"
                  rel="noreferrer"
                >
                  ECDICT
                </a>{" "}
                (MIT license)
              </li>
              <li>
                Chinese dictionary:{" "}
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
                Word levels:{" "}
                <a
                  href="https://github.com/ivankra/hsk30"
                  target="_blank"
                  rel="noreferrer"
                >
                  HSK 3.0
                </a>{" "}
                (MIT license)
              </li>
              <li>
                Word frequency data:{" "}
                <a
                  href="https://github.com/fxsjy/jieba"
                  target="_blank"
                  rel="noreferrer"
                >
                  jieba
                </a>{" "}
                (MIT license)
              </li>
              <li>
                App code:{" "}
                <a
                  href="https://www.apache.org/licenses/LICENSE-2.0"
                  target="_blank"
                  rel="noreferrer"
                >
                  Apache License 2.0
                </a>
              </li>
            </ul>
          </details>
          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={onOpenSettings}
            >
              Go to Settings
            </button>
          </div>
        </section>

        <div className="about-brand">
          <Logo size={34} />
          <span>Souzi 搜字</span>
        </div>
        <p className="fine-print">Version 0.1.0 · Works without internet after setup.</p>
      </div>
    </div>
  );
}
