import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
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
  getEnglishEntryByWord,
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
import type { FullEnglishMeta } from "./types";
import { useKeyboardViewport } from "./hooks/useKeyboardViewport";
import { useNativeCedictDownload } from "./hooks/useNativeCedictDownload";
import { useFullEnglishDownload } from "./hooks/useFullEnglishDownload";
import { useExamplePack } from "./hooks/useExamplePack";
import { getFullEnglishStatus, removeFullEnglishPack, searchFullEnglish } from "./lib/full-english";
import { ChineseDownloadBanner } from "./components/ChineseDownloadBanner";
import { SearchPage } from "./components/SearchPage";
import { EntryView } from "./components/EntryView";
import { EnglishEntryView } from "./components/EnglishEntryView";
import { ImportView } from "./components/ImportView";
import { SavedView } from "./components/SavedView";
import { SettingsView } from "./components/SettingsView";
import { DownloadsView } from "./components/DownloadsView";
import { InstallView } from "./components/InstallView";
import { AboutView } from "./components/AboutView";
import { SetupView } from "./components/SetupView";
import { Logo } from "./components/Logo";
import { Toast, type ToastMessage } from "./components/Toast";
import {
  backNavigation,
  createInitialNavigation,
  navigateTo,
  parseHash,
  routeToHash,
  syncNavigationState,
  type NavigationState,
  type Route,
  type Tab,
} from "./lib/navigation";

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
  const navRef = useRef<NavigationState>(createInitialNavigation(route));
  const [activeTab, setActiveTab] = useState<Tab>(navRef.current.activeTab);
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
  const [fullEnglishMeta, setFullEnglishMeta] =
    useState<FullEnglishMeta | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const showToast = useCallback(
    (message: string, tone: "default" | "error" = "default") => {
      setToast({ message, tone });
    },
    [],
  );

  const navigate = useCallback(
    (next: Route, options?: { replace?: boolean }) => {
      const hash = routeToHash(next);
      const currentHash = window.location.hash;
      const nextState = navigateTo(navRef.current, next, options);

      navRef.current = nextState;
      setActiveTab(nextState.activeTab);
      setRoute(next);

      if (options?.replace) {
        window.history.replaceState(null, "", hash);
      } else if (hash !== currentHash) {
        window.history.pushState(null, "", hash);
      }
    },
    [],
  );

  const goBack = useCallback((): boolean => {
    const result = backNavigation(navRef.current);
    if (result.exit) return false;

    navRef.current = result.state;
    setActiveTab(result.state.activeTab);
    setRoute(result.route);

    const hash = routeToHash(result.route);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
    return true;
  }, []);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

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
    showToast("Chinese dictionary is ready");
  }, [reloadDictionary, showToast]);

  const nativeDownload = useNativeCedictDownload({
    onInstalled: handleChineseInstalled,
  });

  const handleFullEnglishInstalled = useCallback(
    async (installedMeta: FullEnglishMeta) => {
      setFullEnglishMeta(installedMeta);
      showToast("Full English dictionary is ready");
    },
    [showToast],
  );

  const fullEnglishDownload = useFullEnglishDownload({
    onInstalled: handleFullEnglishInstalled,
  });

  const examplePack = useExamplePack();

  const removeFullEnglish = useCallback(async () => {
    try {
      await removeFullEnglishPack();
      setFullEnglishMeta(null);
      showToast("Full English dictionary removed");
    } catch {
      showToast("The full dictionary could not be removed", "error");
    }
  }, [showToast]);

  useEffect(() => {
    const handlePopState = () => {
      const next = parseHash();
      const nextState = syncNavigationState(navRef.current, next);
      navRef.current = nextState;
      setActiveTab(nextState.activeTab);
      setRoute(next);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
        currentFullEnglish,
      ] = await Promise.all([
        getDictionaryMeta(),
        loadSearchIndex(),
        loadEnglishCore(),
        listFavorites(),
        listEnglishFavorites(),
        getFullEnglishStatus(),
      ]);
      if (!active) return;
      setFullEnglishMeta(currentFullEnglish);

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
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let listener: { remove: () => Promise<void> } | undefined;

    void CapacitorApp.addListener("backButton", () => {
      const active = document.activeElement;
      const typing =
        active instanceof HTMLElement &&
        active.matches(
          "input, textarea, select, [contenteditable='true'], [contenteditable='']",
        );
      if (typing || document.documentElement.classList.contains("keyboard-open")) {
        if (active instanceof HTMLElement) active.blur();
        return;
      }

      if (!ready || setupMode) return;
      if (!goBack()) void CapacitorApp.exitApp();
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }
      listener = handle;
    });

    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, [goBack, ready, setupMode]);

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

  const openEnglishWord = async (word: string) => {
    try {
      if (fullEnglishMeta) {
        const matches = await searchFullEnglish(word);
        const exact =
          matches.find((match) => match.match === "word") ?? matches[0];
        if (exact) {
          openEnglish(exact.id);
          return;
        }
      } else {
        const entry = await getEnglishEntryByWord(word);
        if (entry) {
          openEnglish(entry.id);
          return;
        }
      }
      showToast("That word is not in the dictionary", "error");
    } catch {
      showToast("Could not open that word", "error");
    }
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
      navigate({ name: "search" }, { replace: true });
    },
    [navigate],
  );

  const handleSkipSetup = useCallback(() => {
    finishSetup("skip");
  }, [finishSetup]);

  const handleFinishChineseSetup = useCallback(() => {
    finishSetup("download");
  }, [finishSetup]);

  const savedCount = favorites.length + englishFavorites.length;
  const isNavActive = (name: Tab) => activeTab === name;

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
          onSkip={handleSkipSetup}
          onNext={handleFinishChineseSetup}
          download={nativeDownload}
          fullEnglishMeta={fullEnglishMeta}
          fullDownload={fullEnglishDownload}
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
        {route.name !== "downloads" && (
          <ChineseDownloadBanner
            download={nativeDownload}
            onOpenDownloads={() => navigate({ name: "downloads" })}
          />
        )}
      </header>

      <main className="main">
        <div className="shell">
          {route.name === "search" ? (
            <SearchPage
              index={index}
              englishIndex={englishIndex}
              englishStatus={englishStatus}
              fullEnglish={fullEnglishMeta !== null}
              onOpenEntry={(id) =>
                navigate({ name: "entry", kind: "zh", id })
              }
              onOpenEnglish={openEnglish}
              onOpenSimp={openSimp}
              onAbout={() => navigate({ name: "about" })}
              onToast={showToast}
            />
          ) : route.name === "entry" ? (
            route.kind === "zh" ? (
              <EntryView
                id={route.id}
                favorites={favorites}
                onBack={handleBack}
                onOpenEntry={(id) =>
                  navigate({ name: "entry", kind: "zh", id })
                }
                onOpenSimp={openSimp}
                onFavoriteChange={() => void refreshFavorites()}
                onToast={showToast}
              />
            ) : (
              <EnglishEntryView
                id={route.id}
                favorites={englishFavorites}
                fullEnglish={fullEnglishMeta !== null}
                onBack={handleBack}
                onOpenWord={openEnglishWord}
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
              theme={theme}
              onThemeChange={setTheme}
              onDownloads={() => navigate({ name: "downloads" })}
              onAbout={() => navigate({ name: "about" })}
            />
          ) : route.name === "downloads" ? (
            <DownloadsView
              chineseMeta={meta}
              englishStatus={englishStatus}
              download={nativeDownload}
              fullEnglishMeta={fullEnglishMeta}
              fullDownload={fullEnglishDownload}
              examplePack={examplePack}
              onRemoveFullEnglish={() => void removeFullEnglish()}
              onBack={handleBack}
              onInstallEnglish={installEnglish}
              onImport={() => navigate({ name: "import" })}
              onOpenInstall={() => navigate({ name: "install" })}
            />
          ) : route.name === "install" ? (
            <InstallView onBack={handleBack} />
          ) : route.name === "about" ? (
            <AboutView
              onBack={handleBack}
              onOpenSettings={() => navigate({ name: "settings" })}
            />
          ) : (
            <ImportView
              meta={meta}
              onImported={() => void reloadDictionary()}
              onDone={() => navigate({ name: "search" }, { replace: true })}
              onBack={handleBack}
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
