import { useCallback, useEffect, useState } from "react";
import { Search, Settings, Star } from "lucide-react";
import type {
  DictionaryMeta,
  EnglishCoreMeta,
  EnglishCoreStatus,
  EnglishSavedWord,
  EnglishSearchIndex,
  SearchIndex,
  Theme,
  UserWord,
} from "./types";
import {
  getDictionaryMeta,
  getEntryBySimp,
  listEnglishFavorites,
  listFavorites,
  loadEnglishCore,
  loadSearchIndex,
  removeEnglishFavorite,
  removeFavorite,
} from "./lib/db";
import {
  ECDICT_CORE_VERSION,
  ensureEnglishCore,
} from "./lib/english-core";
import { useKeyboardViewport } from "./hooks/useKeyboardViewport";
import { useNativeCedictDownload } from "./hooks/useNativeCedictDownload";
import { ChineseDownloadBanner } from "./components/ChineseDownloadBanner";
import { SearchPage } from "./components/SearchPage";
import { EntryView } from "./components/EntryView";
import { EnglishEntryView } from "./components/EnglishEntryView";
import { ImportView } from "./components/ImportView";
import { SavedView } from "./components/SavedView";
import { SettingsView } from "./components/SettingsView";
import { AboutView } from "./components/AboutView";
import { SetupView } from "./components/SetupView";
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
  const stored = localStorage.getItem("souzi-theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

type SetupChoice = "download" | "skip";
const SETUP_CHOICE_KEY = "souzi-setup-choice";

function getSetupChoice(): SetupChoice | null {
  try {
    const stored = localStorage.getItem(SETUP_CHOICE_KEY);
    return stored === "download" || stored === "skip" ? stored : null;
  } catch {
    return null;
  }
}

function saveSetupChoice(choice: SetupChoice): void {
  try {
    localStorage.setItem(SETUP_CHOICE_KEY, choice);
  } catch {
    // The current session can still continue if storage is unavailable.
  }
}

export default function App() {
  useKeyboardViewport();
  const [route, setRoute] = useState<Route>(parseHash);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<DictionaryMeta | null>(null);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [favorites, setFavorites] = useState<UserWord[]>([]);
  const [englishIndex, setEnglishIndex] = useState<EnglishSearchIndex | null>(
    null,
  );
  const [englishStatus, setEnglishStatus] =
    useState<EnglishCoreStatus>("idle");
  const [englishMeta, setEnglishMeta] = useState<EnglishCoreMeta | null>(null);
  const [englishFavorites, setEnglishFavorites] = useState<EnglishSavedWord[]>(
    [],
  );
  const [setupMode, setSetupMode] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

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

  const handleChineseInstalled = useCallback(async () => {
    await reloadDictionary();
    showToast("Chinese words are ready");
  }, [reloadDictionary, showToast]);

  const nativeDownload = useNativeCedictDownload({
    onInstalled: handleChineseInstalled,
  });

  useEffect(() => {
    const handleHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const [
        currentMeta,
        currentIndex,
        currentEnglish,
        currentFavorites,
        currentEnglishFavorites,
      ] = await Promise.all([
        getDictionaryMeta(),
        loadSearchIndex(),
        loadEnglishCore(),
        listFavorites(),
        listEnglishFavorites(),
      ]);
      if (!active) return;

      const setupChoice = getSetupChoice();
      const chineseIsReady =
        currentMeta?.kind === "cedict" && currentIndex !== null;
      let nextEnglish = currentEnglish;
      let englishFailed = false;

      // The English core ships with the app. Install or update it silently
      // instead of asking the user to perform a setup step for included data.
      if (nextEnglish?.meta.version !== ECDICT_CORE_VERSION) {
        try {
          const installed = await ensureEnglishCore();
          if (!active) return;
          nextEnglish = installed;
        } catch {
          if (!active) return;
          englishFailed = true;
        }
      }

      const englishIsCurrent =
        nextEnglish?.meta.version === ECDICT_CORE_VERSION;

      setMeta(currentMeta ?? null);
      setIndex(currentIndex);
      setFavorites(currentFavorites);
      setEnglishFavorites(currentEnglishFavorites);
      setEnglishIndex(
        englishIsCurrent && nextEnglish ? nextEnglish.index : null,
      );
      setEnglishMeta(nextEnglish?.meta ?? null);
      setEnglishStatus(
        englishIsCurrent ? "ready" : englishFailed ? "error" : "idle",
      );
      setSetupMode(setupChoice === null && !chineseIsReady);
      setReady(true);

      navigator.storage?.persist?.().catch(() => {
        // Persistence is best-effort.
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
    localStorage.setItem("souzi-theme", theme);

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

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

  const installEnglish = async () => {
    setEnglishStatus("loading");
    try {
      const { index: nextIndex, meta: nextMeta } = await ensureEnglishCore();
      setEnglishIndex(nextIndex);
      setEnglishMeta(nextMeta);
      setEnglishStatus("ready");
    } catch {
      setEnglishStatus("error");
    }
  };

  const handleChineseImported = async () => {
    await reloadDictionary();
  };

  const finishSetup = useCallback(
    (choice: SetupChoice) => {
      saveSetupChoice(choice);
      setSetupMode(false);
      navigate({ name: "search" });
    },
    [navigate],
  );

  const handleSkipSetup = useCallback(() => {
    finishSetup("skip");
  }, [finishSetup]);

  const handleStartChineseDownload = useCallback(() => {
    void nativeDownload.start();
    finishSetup("download");
  }, [finishSetup, nativeDownload.start]);

  const handleFinishChineseSetup = useCallback(() => {
    finishSetup("download");
  }, [finishSetup]);

  const savedCount = favorites.length + englishFavorites.length;
  const isNavActive = (name: "search" | "saved" | "settings") =>
    route.name === name ||
    (name === "search" && (route.name === "entry" || route.name === "import"));

  if (!ready) {
    return (
      <div className="app setup-app">
        <main className="main">
          <div className="shell">
            <div className="loading-screen">
              <Logo size={54} />
              <div className="loading-title">Opening Souzi</div>
              <div className="loading-sub">Getting your words ready…</div>
              <div className="loading-bar">
                <div className="loading-bar-fill" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (setupMode) {
    return (
      <div className="app setup-app">
        <SetupView
          chineseMeta={meta}
          englishStatus={englishStatus}
          onInstallEnglish={installEnglish}
          onChineseImported={handleChineseImported}
          onStartDownload={handleStartChineseDownload}
          onSkip={handleSkipSetup}
          onNext={handleFinishChineseSetup}
          wifiOnly={nativeDownload.wifiOnly}
          onWifiOnlyChange={nativeDownload.setWifiOnly}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="shell header-inner">
          <button
            type="button"
            className="brand"
            onClick={() => navigate({ name: "search" })}
            aria-label="Souzi home"
          >
            <Logo size={36} />
            <span className="brand-text">
              <span className="brand-name">Souzi</span>
              <span className="brand-sub">搜字</span>
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
        <ChineseDownloadBanner download={nativeDownload} />
      </header>

      <main className="main">
        <div className="shell">
          {route.name === "search" ? (
            <SearchPage
              index={index}
              englishIndex={englishIndex}
              englishStatus={englishStatus}
              onOpenEntry={(id) =>
                navigate({ name: "entry", kind: "zh", id })
              }
              onOpenEnglish={openEnglish}
              onOpenSimp={openSimp}
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
              englishStatus={englishStatus}
              theme={theme}
              onThemeChange={setTheme}
              onImport={() => navigate({ name: "import" })}
              onInstallEnglish={installEnglish}
              onAbout={() => navigate({ name: "about" })}
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
