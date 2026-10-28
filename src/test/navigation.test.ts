import { describe, expect, it } from "vitest";
import {
  backNavigation,
  createInitialNavigation,
  navigateTo,
  type NavigationState,
  type Route,
} from "../lib/navigation";

const entry = (id = 1): Route => ({ name: "entry", kind: "zh", id });

function back(state: NavigationState) {
  return backNavigation(state);
}

describe("navigation back behavior", () => {
  it("exits only from the Search home screen", () => {
    const initial = createInitialNavigation({ name: "search" });
    expect(back(initial).exit).toBe(true);
  });

  it("unnests an entry before leaving the Search tab", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, entry());

    const fromEntry = back(state);
    expect(fromEntry.exit).toBe(false);
    expect(fromEntry.route).toEqual({ name: "search" });
    expect(back(fromEntry.state).exit).toBe(true);
  });

  it("returns to the previous tab from a tab root", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, { name: "saved" });

    const fromSaved = back(state);
    expect(fromSaved.exit).toBe(false);
    expect(fromSaved.route).toEqual({ name: "search" });

    expect(back(fromSaved.state).exit).toBe(true);
  });

  it("returns to the previous tab after switching from a nested entry", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, entry());
    state = navigateTo(state, { name: "settings" });

    const fromSettings = back(state);
    expect(fromSettings.exit).toBe(false);
    expect(fromSettings.route).toEqual({ name: "search" });
    expect(back(fromSettings.state).exit).toBe(true);
  });

  it("does not return to a hidden nested screen when switching tabs", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, { name: "saved" });
    state = navigateTo(state, entry(2));
    state = navigateTo(state, { name: "settings" });

    const fromSettings = back(state);
    expect(fromSettings.route).toEqual({ name: "saved" });

    const fromSaved = back(fromSettings.state);
    expect(fromSaved.route).toEqual({ name: "search" });
  });

  it("unnests Settings flows one level at a time", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, { name: "settings" });
    state = navigateTo(state, { name: "downloads" });
    state = navigateTo(state, { name: "import" });

    const fromImport = back(state);
    expect(fromImport.route).toEqual({ name: "downloads" });

    const fromDownloads = back(fromImport.state);
    expect(fromDownloads.route).toEqual({ name: "settings" });

    const fromSettings = back(fromDownloads.state);
    expect(fromSettings.route).toEqual({ name: "search" });
  });

  it("unnests a chain of entries one screen at a time", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, entry(1));
    state = navigateTo(state, entry(2));

    const fromSecond = back(state);
    expect(fromSecond.route).toEqual(entry(1));

    const fromFirst = back(fromSecond.state);
    expect(fromFirst.route).toEqual({ name: "search" });
    expect(back(fromFirst.state).exit).toBe(true);
  });

  it("returns About to Search when it was opened there", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, { name: "about" });

    const fromAbout = back(state);
    expect(fromAbout.route).toEqual({ name: "search" });
  });

  it("returns About to the tab it was opened from", () => {
    let state = createInitialNavigation({ name: "settings" });
    state = navigateTo(state, { name: "about" });

    const fromAbout = back(state);
    expect(fromAbout.route).toEqual({ name: "settings" });
  });

  it("treats a direct Settings flow as nested under Settings", () => {
    const state = createInitialNavigation({ name: "downloads" });

    const fromDownloads = back(state);
    expect(fromDownloads.route).toEqual({ name: "settings" });

    const fromSettings = back(fromDownloads.state);
    expect(fromSettings.route).toEqual({ name: "search" });
  });

  it("resets tab history when an explicit replacement returns home", () => {
    let state = createInitialNavigation({ name: "settings" });
    state = navigateTo(state, { name: "downloads" });
    state = navigateTo(state, { name: "import" });
    state = navigateTo(state, { name: "search" }, { replace: true });

    expect(back(state).exit).toBe(true);
  });

  it("resets a tab to its root when that tab is tapped", () => {
    let state = createInitialNavigation({ name: "search" });
    state = navigateTo(state, { name: "saved" });
    state = navigateTo(state, entry(2));
    state = navigateTo(state, { name: "search" });

    expect(back(state).exit).toBe(true);
  });
});
