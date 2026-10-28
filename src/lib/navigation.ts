export type EntryKind = "zh" | "en";

export type Route =
  | { name: "search" }
  | { name: "entry"; kind: EntryKind; id: number }
  | { name: "saved" }
  | { name: "settings" }
  | { name: "about" }
  | { name: "downloads" }
  | { name: "import" };

export type Tab = "search" | "saved" | "settings";

export type NavigationState = {
  activeTab: Tab;
  stacks: Record<Tab, Route[]>;
  tabHistory: Tab[];
};

export const TAB_ROOTS: Record<Tab, Route> = {
  search: { name: "search" },
  saved: { name: "saved" },
  settings: { name: "settings" },
};

export function parseHash(): Route {
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
  if (name === "downloads") return { name: "downloads" };
  if (name === "import") return { name: "import" };
  return { name: "search" };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "entry":
      return `#/${route.kind}/${route.id}`;
    case "saved":
      return "#/saved";
    case "settings":
      return "#/settings";
    case "about":
      return "#/about";
    case "downloads":
      return "#/downloads";
    case "import":
      return "#/import";
    default:
      return "#/";
  }
}

export function routeKey(route: Route): string {
  return route.name === "entry"
    ? `entry/${route.kind}/${route.id}`
    : route.name;
}

function isTabRoot(route: Route): boolean {
  return (
    route.name === "search" ||
    route.name === "saved" ||
    route.name === "settings"
  );
}

export function tabForRoute(route: Route, fallback: Tab = "search"): Tab {
  if (route.name === "search") return "search";
  if (route.name === "saved") return "saved";
  if (
    route.name === "settings" ||
    route.name === "downloads" ||
    route.name === "import"
  ) {
    return "settings";
  }
  return fallback;
}

function createStacks(): Record<Tab, Route[]> {
  return {
    search: [{ name: "search" }],
    saved: [{ name: "saved" }],
    settings: [{ name: "settings" }],
  };
}

function stackForRoute(route: Route, tab: Tab): Route[] {
  if (route.name === "downloads") {
    return [{ name: "settings" }, route];
  }
  if (route.name === "import") {
    return [
      { name: "settings" },
      { name: "downloads" },
      route,
    ];
  }
  if (route.name === "entry" || route.name === "about") {
    return [TAB_ROOTS[tab], route];
  }
  return [route];
}

export function createInitialNavigation(
  route: Route,
  fallback: Tab = "search",
): NavigationState {
  const activeTab = tabForRoute(route, fallback);
  const stacks = createStacks();
  stacks[activeTab] = stackForRoute(route, activeTab);
  return { activeTab, stacks, tabHistory: [] };
}

export function navigateTo(
  state: NavigationState,
  next: Route,
  options: { replace?: boolean } = {},
): NavigationState {
  const targetTab = tabForRoute(next, state.activeTab);

  if (options.replace) {
    const stacks = createStacks();
    stacks[targetTab] = stackForRoute(next, targetTab);
    return { activeTab: targetTab, stacks, tabHistory: [] };
  }

  if (targetTab !== state.activeTab) {
    const stacks = {
      ...state.stacks,
      [targetTab]: stackForRoute(next, targetTab),
    };
    return {
      activeTab: targetTab,
      stacks,
      tabHistory:
        targetTab === "search"
          ? []
          : [...state.tabHistory, state.activeTab],
    };
  }

  if (isTabRoot(next)) {
    return {
      ...state,
      stacks: { ...state.stacks, [targetTab]: [next] },
    };
  }

  const stack = state.stacks[targetTab];
  if (routeKey(stack[stack.length - 1]) === routeKey(next)) return state;

  return {
    ...state,
    stacks: { ...state.stacks, [targetTab]: [...stack, next] },
  };
}

export type BackResult =
  | { exit: true; state: NavigationState; route: Route }
  | { exit: false; state: NavigationState; route: Route };

export function backNavigation(state: NavigationState): BackResult {
  const stack = state.stacks[state.activeTab];
  const current = stack[stack.length - 1] ?? TAB_ROOTS[state.activeTab];

  if (stack.length > 1) {
    const nextStack = stack.slice(0, -1);
    const next = nextStack[nextStack.length - 1];
    return {
      exit: false,
      state: {
        ...state,
        stacks: { ...state.stacks, [state.activeTab]: nextStack },
      },
      route: next,
    };
  }

  if (state.activeTab === "search") {
    return { exit: true, state, route: current };
  }

  const previousTab = state.tabHistory[state.tabHistory.length - 1] ?? "search";
  const route = TAB_ROOTS[previousTab];
  return {
    exit: false,
    state: {
      activeTab: previousTab,
      stacks: { ...state.stacks, [previousTab]: [route] },
      tabHistory: state.tabHistory.slice(0, -1),
    },
    route,
  };
}

export function syncNavigationState(
  state: NavigationState,
  route: Route,
): NavigationState {
  const activeTab = tabForRoute(route, state.activeTab);
  const stacks = createStacks();
  stacks[activeTab] = stackForRoute(route, activeTab);
  return { activeTab, stacks, tabHistory: [] };
}
