import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, ExternalLink, Smartphone } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const RELEASES_URL = "https://github.com/amoshydra/souzi/releases/latest";

export function InstallView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  useDocumentTitle(t("install.title"));

  return (
    <div className="page install-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> {t("common.back")}
      </button>

      <header className="page-heading">
        <div className="section-kicker">{t("install.kicker")}</div>
        <h1>{t("install.title")}</h1>
        <p>{t("install.body")}</p>
      </header>

      <section className="settings-card install-card">
        <div className="install-steps">
          <div className="install-step">
            <span className="install-step-number" aria-hidden="true">
              1
            </span>
            <div>
              <h2>{t("install.step1Title")}</h2>
              <p>{t("install.step1Body")}</p>
            </div>
          </div>
          <div className="install-step">
            <span className="install-step-number" aria-hidden="true">
              2
            </span>
            <div>
              <h2>{t("install.step2Title")}</h2>
              <p>{t("install.step2Body")}</p>
            </div>
          </div>
          <div className="install-step">
            <span className="install-step-number" aria-hidden="true">
              3
            </span>
            <div>
              <h2>{t("install.step3Title")}</h2>
              <p>{t("install.step3Body")}</p>
            </div>
          </div>
        </div>

        <div className="install-actions">
          <a
            className="button button-primary install-primary"
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={18} aria-hidden="true" />
            {t("install.downloadApk")}
          </a>
          <a
            className="text-link install-secondary"
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {t("install.openRelease")}
          </a>
        </div>
      </section>

      <section className="settings-card install-qr-card">
        <div className="install-qr-copy">
          <Smartphone size={20} aria-hidden="true" />
          <div>
            <h2>{t("install.onComputerTitle")}</h2>
            <p>{t("install.onComputerBody")}</p>
          </div>
        </div>
        <img
          className="install-qr"
          src={`${import.meta.env.BASE_URL}install-qr.png`}
          alt={t("install.qrAlt")}
          width={180}
          height={180}
        />
      </section>

      <p className="entry-source">{t("install.footer")}</p>
    </div>
  );
}
