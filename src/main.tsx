import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

// The native shell loads local assets and does not use a service worker.
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(<App />);
