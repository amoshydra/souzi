import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// The Android/Capacitor build serves the app from "/".
// The GitHub Pages build sets VITE_BASE_PATH=/souzi/.
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "og-image.png",
        "robots.txt",
        "sitemap.xml",
        "icons/*.png",
      ],
      manifest: {
        name: "Souzi — Chinese Dictionary",
        short_name: "Souzi",
        description:
          "A free, offline-first English–Chinese dictionary for web and Android. No account, no tracking, and no server.",
        id: base,
        lang: "en",
        categories: ["education", "reference"],
        theme_color: "#1f4d40",
        background_color: "#f7f3e8",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: `${base}icons/icon-maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2,gz}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: "es2022",
    outDir: process.env.VITE_OUT_DIR || "dist",
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
