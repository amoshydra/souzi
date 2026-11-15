import { describe, expect, it } from "vitest";
import {
  exchangeForms,
  exampleAttribution,
  mergeExamples,
} from "../lib/example-sentences";

describe("exchangeForms", () => {
  it("extracts unique forms from an exchange string", () => {
    expect(exchangeForms("p:ran/d:run/i:running/3:runs")).toEqual([
      "ran",
      "run",
      "running",
      "runs",
    ]);
  });

  it("ignores empty and single-character values", () => {
    expect(exchangeForms("p:/d:a/3:runs")).toEqual(["runs"]);
  });
});

describe("exampleAttribution", () => {
  it("attributes Tatoeba examples", () => {
    expect(exampleAttribution([{ text: "Run.", translation: "跑。", source: "Tatoeba" }])).toBe(
      "tatoeba",
    );
  });

  it("attributes mixed sources", () => {
    expect(
      exampleAttribution([
        { text: "Run.", translation: "跑。", source: "Tatoeba" },
        { text: "I run.", translation: "我跑。", source: "Starter" },
      ]),
    ).toBe("tatoebaAndStarter");
  });

  it("falls back to the starter label", () => {
    expect(exampleAttribution([{ text: "Run.", translation: "跑。", source: "Starter" }])).toBe(
      "starter",
    );
  });

  it("normalises lowercase starter sources", () => {
    expect(exampleAttribution([{ text: "Run.", translation: "跑。", source: "starter" }])).toBe(
      "starter",
    );
  });

  it("returns null for no examples", () => {
    expect(exampleAttribution([])).toBeNull();
  });
});


describe("mergeExamples", () => {
  it("puts installed examples first and dedupes", () => {
    const merged = mergeExamples(
      { run: [{ text: "I run daily.", translation: "我每天跑。", source: "Starter" }] },
      {
        run: [
          { text: "I run.", translation: "我跑。", source: "Tatoeba" },
          { text: "She runs.", translation: "她跑。", source: "Tatoeba" },
        ],
      },
    );

    expect(merged.run.map((example) => example.source)).toEqual([
      "Tatoeba",
      "Tatoeba",
      "Starter",
    ]);
  });

  it("caps merged examples at four", () => {
    const merged = mergeExamples(
      { run: Array.from({ length: 5 }, (_, index) => ({ text: `Starter ${index}`, translation: "x" })) },
      { run: Array.from({ length: 5 }, (_, index) => ({ text: `Pack ${index}`, translation: "x" })) },
    );

    expect(merged.run).toHaveLength(4);
    expect(merged.run[0].text).toBe("Pack 0");
  });

  it("keeps language-only keys and ignores empty values", () => {
    const merged = mergeExamples(
      { 学: [{ text: "我学中文。", translation: "I study Chinese." }] },
      { run: [{ text: "I run.", translation: "我跑。" }] },
    );

    expect(Object.keys(merged).sort()).toEqual(["run", "学"]);
  });

  it("handles empty maps", () => {
    expect(mergeExamples({}, {})).toEqual({});
  });
});
