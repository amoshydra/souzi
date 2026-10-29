import { ArrowLeft, Download, ExternalLink, Smartphone } from "lucide-react";

const RELEASES_URL = "https://github.com/amoshydra/souzi/releases/latest";

export function InstallView({ onBack }: { onBack: () => void }) {
  return (
    <div className="page install-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>

      <header className="page-heading">
        <div className="section-kicker">Android app</div>
        <h1>Get the full dictionary</h1>
        <p>
          The full English dictionary is only available in the Android app. It
          adds about 770,000 English words and works offline.
        </p>
      </header>

      <section className="settings-card install-card">
        <div className="install-steps">
          <div className="install-step">
            <span className="install-step-number">1</span>
            <div>
              <h2>Download the app</h2>
              <p>Open the release page and download the newest APK.</p>
            </div>
          </div>
          <div className="install-step">
            <span className="install-step-number">2</span>
            <div>
              <h2>Allow the install</h2>
              <p>
                If Android asks, allow your browser or file manager to install
                apps from this source.
              </p>
            </div>
          </div>
          <div className="install-step">
            <span className="install-step-number">3</span>
            <div>
              <h2>Open Souzi</h2>
              <p>
                Install the file, open Souzi, then go to Packs and add the
                full English dictionary.
              </p>
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
            <Download size={18} />
            Download APK
          </a>
          <a
            className="text-link install-secondary"
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            Open release page
          </a>
        </div>
      </section>

      <section className="settings-card install-qr-card">
        <div className="install-qr-copy">
          <Smartphone size={20} />
          <div>
            <h2>On a computer?</h2>
            <p>Scan this code with your Android phone to open the release page.</p>
          </div>
        </div>
        <img
          className="install-qr"
          src={`${import.meta.env.BASE_URL}install-qr.png`}
          alt="QR code for the Souzi release page"
          width={180}
          height={180}
        />
      </section>

      <p className="entry-source">
        The web app stays available. The Android app is needed for the full
        English dictionary.
      </p>
    </div>
  );
}
