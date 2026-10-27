import { useCallback, useEffect, useState } from "react";
import { Search, Settings, Star } from "lucide-react";
import type {
  BeforeInstallPromptEvent,
  DictionaryMeta,
  EnglishCoreMeta,
  EnglishSavedWord,
  EnglishSearchIndex,
  SearchIndex,
  Theme,
  UserWord,
} from "./types";
import {
  clearHistory as clearHistoryDb,
  getDictionaryMeta,
  getEntryBySimp,
  listEnglishFavorites,
  listFavorites,
  loadSearchIndex,
  removeEnglishFavorite,
  removeFavorite,
  resetToStarter,
  seedStarter,
} from "./lib/db";
import { ensureEnglishCore } from "./lib/english-core";
import { SearchPage } from "./components/SearchPage";
import { EntryView } from "./components/EntryView";
import { EnglishEntryView } from "./components/EnglishEntryView";
import { ImportView } from "./components/ImportView";
import { SavedView } from "./components/SavedView";
import { SettingsView } from "./components/SettingsView";
import { AboutView } from "./components/AboutView";
import { Logo } from "./components/Logo";
import { Toast, type ToastMessage } from "./components/Toast";

type EntryKind = "zh" | "en";

type Route =
  | { name: "search" }
  | { name: "entry"; kind: EntryKind; id: number }
  | { name: "saved" }
  | { name: "settings" }
  | { name: "about" }
  | { name: "import" };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [name, value] = hash.split("/");

  if ((name === "entry" || name === "zh" || name === "en") && value) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      return { name: "entry", kind: name === "en" ? "en" : "zh", id };
    }
  }
  if (name === "saved") return { name: "saved" };
  if (name === "settings") return { name: "settings" };
  if (name === "about") return { name: "about" };
  if (name === "import") return { name: "import" };
  return { name: "search" };
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case "entry":
      return `#/${route.kind}/${route.id}`;
    case "saved":
      return "#/saved";
    case "settings":
      return "#/settings";
    case "about":
      return "#/about";
    case "import":
      return "#/import";
    default:
      return "#/";
  }
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("ciqiao-theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<DictionaryMeta | null>(null);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [favorites, setFavorites] = useState<UserWord[]>([]);
  const [englishIndex, setEnglishIndex] = useState<EnglishSearchIndex | null>(
    null,
  );
  const [englishStatus, setEnglishStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [englishMeta, setEnglishMeta] = useState<EnglishCoreMeta | null>(null);
  const [englishFavorites, setEnglishFavorites] = useState<EnglishSavedWord[]>(
    [],
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const showToast = useCallback(
    (message: string, tone: "default" | "error" = "default") => {
      setToast({ message, tone });
    },
    [],
  );

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash) {
      setRoute(next);
      return;
    }
    window.location.hash = hash;
  }, []);

  const refreshFavorites = useCallback(async () => {
    setFavorites(await listFavorites());
  }, []);

  const refreshEnglishFavorites = useCallback(async () => {
    setEnglishFavorites(await listEnglishFavorites());
  }, []);

  const reloadDictionary = useCallback(async () => {
    const [nextMeta, nextIndex, nextFavorites] = await Promise.all([
      getDictionaryMeta(),
      loadSearchIndex(),
      listFavorites(),
    ]);
    setMeta(nextMeta ?? null);
    setIndex(nextIndex);
    setFavorites(nextFavorites);
  }, []);

  useEffect(() => {
    const handleHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      let currentMeta = await getDictionaryMeta();
      if (!currentMeta) {
        currentMeta = await seedStarter();
      }

      let currentIndex = await loadSearchIndex();
      if (!currentIndex && currentMeta.kind === "starter") {
        currentMeta = await seedStarter();
        currentIndex = await loadSearchIndex();
      }

      const [currentFavorites, currentEnglishFavorites] = await Promise.all([
        listFavorites(),
        listEnglishFavorites(),
      ]);
      if (!active) return;

      setMeta(currentMeta);
      setIndex(currentIndex);
      setFavorites(currentFavorites);
      setEnglishFavorites(currentEnglishFavorites);
      setReady(true);

      navigator.storage?.persist?.().catch(() => {
        // Persistence is best-effort.
      });

      void ensureEnglishCore()
        .then(({ index: nextEnglishIndex, meta: nextEnglishMeta }) => {
          if (!active) return;
          setEnglishIndex(nextEnglishIndex);
          setEnglishMeta(nextEnglishMeta);
          setEnglishStatus("ready");
        })
        .catch(() => {
          if (active) setEnglishStatus("error");
        });
    }

    void init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };

    apply();
    localStorage.setItem("ciqiao-theme", theme);

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") showToast("Ciqiao installed");
    setInstallPrompt(null);
  };

  const openSimp = async (simp: string) => {
    const entry = await getEntryBySimp(simp);
    if (!entry) {
      showToast("That word is no longer in the dictionary", "error");
      return;
    }
    navigate({ name: "entry", kind: "zh", id: entry.id });
  };

  const openEnglish = (id: number) => {
    navigate({ name: "entry", kind: "en", id });
  };

  const handleReset = async () => {
    const nextMeta = await resetToStarter();
    setMeta(nextMeta);
    setIndex(await loadSearchIndex());
    setFavorites(await listFavorites());
  };

  const savedCount = favorites.length + englishFavorites.length;
  const isNavActive = (name: "search" | "saved" | "settings") =>
    route.name === name ||
    (name === "search" && (route.name === "entry" || route.name === "import"));

  return (
    <div className="app">
      <header className="header">
        <div className="shell header-inner">
          <button
            type="button"
            className="brand"
            onClick={() => navigate({ name: "search" })}
            aria-label="Ciqiao home"
          >
            <Logo size={36} />
            <span className="brand-text">
              <span className="brand-name">Ciqiao</span>
              <span className="brand-sub">词桥</span>
            </span>
          </button>

          <nav className="header-nav" aria-label="Main">
            <button
              type="button"
              className={`nav-link ${isNavActive("search") ? "nav-link-active" : ""}`}
              onClick={() => navigate({ name: "search" })}
            >
              <Search size={16} />
              Search
            </button>
            <button
              type="button"
              className={`nav-link ${isNavActive("saved") ? "nav-link-active" : ""}`}
              onClick={() => navigate({ name: "saved" })}
            >
              <Star size={16} />
              Saved
              {savedCount > 0 && <span className="nav-count">{savedCount}</span>}
            </button>
            <button
              type="button"
              className={`nav-link ${isNavActive("settings") ? "nav-link-active" : ""}`}
              onClick={() => navigate({ name: "settings" })}
            >
              <Settings size={16} />
              Settings
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="shell">
          {!ready ? (
            <div className="loading-screen">
              <Logo size={54} />
              <div className="loading-title">Opening Ciqiao</div>
              <div className="loading-sub">Loading your offline dictionary…</div>
              <div className="loading-bar">
                <div className="loading-bar-fill" />
              </div>
            </div>
          ) : route.name === "search" ? (
            <SearchPage
              index={index}
              englishIndex={englishIndex}
              englishStatus={englishStatus}
              meta={meta}
              onOpenEntry={(id) =>
                navigate({ name: "entry", kind: "zh", id })
              }
              onOpenEnglish={openEnglish}
              onOpenSimp={openSimp}
              onImport={() => navigate({ name: "import" })}
              onAbout={() => navigate({ name: "about" })}
            />
          ) : route.name === "entry" ? (
            route.kind === "zh" ? (
              <EntryView
                id={route.id}
                favorites={favorites}
                onBack={() => navigate({ name: "search" })}
                onOpenEntry={(id) =>
                  navigate({ name: "entry", kind: "zh", id })
                }
                onFavoriteChange={() => void refreshFavorites()}
                onToast={showToast}
              />
            ) : (
              <EnglishEntryView
                id={route.id}
                favorites={englishFavorites}
                onBack={() => navigate({ name: "search" })}
                onFavoriteChange={() => void refreshEnglishFavorites()}
                onToast={showToast}
              />
            )
          ) : route.name === "saved" ? (
            <SavedView
              favorites={favorites}
              englishFavorites={englishFavorites}
              onOpenSimp={openSimp}
              onOpenEnglish={openEnglish}
              onRemove={async (simp) => {
                await removeFavorite(simp);
                await refreshFavorites();
                showToast("Removed from saved words");
              }}
              onRemoveEnglish={async (key) => {
                await removeEnglishFavorite(key);
                await refreshEnglishFavorites();
                showToast("Removed from saved words");
              }}
              onBrowse={() => navigate({ name: "search" })}
            />
          ) : route.name === "settings" ? (
            <SettingsView
              meta={meta}
              englishMeta={englishMeta}
              englishStatus={englishStatus}
              theme={theme}
              onThemeChange={setTheme}
              onImport={() => navigate({ name: "import" })}
              onReset={handleReset}
              onClearHistory={clearHistoryDb}
              installPrompt={installPrompt}
              onInstall={handleInstall}
              onAbout={() => navigate({ name: "about" })}
              onToast={showToast}
            />
          ) : route.name === "about" ? (
            <AboutView
              onBack={() => navigate({ name: "search" })}
              onOpenSettings={() => navigate({ name: "settings" })}
            />
          ) : (
            <ImportView
              meta={meta}
              onImported={() => void reloadDictionary()}
              onDone={() => navigate({ name: "search" })}
              onBack={() => navigate({ name: "search" })}
              onToast={showToast}
            />
          )}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Main">
        <button
          type="button"
          className={`bottom-link ${isNavActive("search") ? "bottom-link-active" : ""}`}
          onClick={() => navigate({ name: "search" })}
        >
          <Search size={21} />
          <span>Search</span>
        </button>
        <button
          type="button"
          className={`bottom-link ${isNavActive("saved") ? "bottom-link-active" : ""}`}
          onClick={() => navigate({ name: "saved" })}
        >
          <Star size={21} />
          <span>Saved</span>
          {savedCount > 0 && <span className="bottom-dot" />}
        </button>
        <button
          type="button"
          className={`bottom-link ${isNavActive("settings") ? "bottom-link-active" : ""}`}
          onClick={() => navigate({ name: "settings" })}
        >
          <Settings size={21} />
          <span>Settings</span>
        </button>
      </nav>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
