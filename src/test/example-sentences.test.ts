import { describe, expect, it } from "vitest";
import { exchangeForms, exampleAttribution } from "../lib/example-sentences";

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
      "Examples from Tatoeba (CC BY 2.0 FR)",
    );
  });

  it("attributes mixed sources", () => {
    expect(
      exampleAttribution([
        { text: "Run.", translation: "跑。", source: "Tatoeba" },
        { text: "I run.", translation: "我跑。", source: "Starter" },
      ]),
    ).toBe("Examples from Tatoeba (CC BY 2.0 FR) and the starter set");
  });

  it("falls back to the starter label", () => {
    expect(exampleAttribution([{ text: "Run.", translation: "跑。", source: "Starter" }])).toBe(
      "Starter examples",
    );
  });
});
