import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { initI18n } from "./i18n";
import App from "./App";
import "./styles.css";

// The native shell loads local assets and does not use a service worker.
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}

async function bootstrap(): Promise<void> {
  // English is in the main chunk; the active zh locale is fetched now, before
  // the first React render, so there is no flash of English.
  try {
    await initI18n();
  } catch {
    // initI18n already falls back to English.
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
