import { describe, expect, it } from "vitest";
import type { EnglishEntry } from "../types";
import {
  buildEnglishIndex,
  normalizeEnglishWord,
  searchEnglishIndex,
} from "../lib/english";

function entry(overrides: Partial<EnglishEntry>): EnglishEntry {
  return {
    id: 1,
    word: "bank",
    phonetic: "bæŋk",
    translations: ["n. 银行"],
    definitions: [],
    pos: "",
    tags: [],
    collins: 0,
    oxford: 0,
    bnc: 0,
    frq: 0,
    exchange: "",
    source: "ecdict",
    ...overrides,
  };
}

const entries: EnglishEntry[] = [
  entry({ id: 1, word: "bank", exchange: "s:banks", frq: 663 }),
  entry({
    id: 2,
    word: "computer",
    phonetic: "kəm'pju:tə",
    translations: ["n. 电脑"],
    tags: ["cet4"],
    frq: 589,
  }),
  entry({
    id: 3,
    word: "pay",
    translations: ["v. 支付"],
    exchange: "d:paid/i:paying/3:pays",
    frq: 286,
  }),
  entry({
    id: 4,
    word: "go",
    translations: ["v. 去"],
    exchange: "p:went/i:going/3:goes",
    frq: 100,
  }),
  entry({
    id: 5,
    word: "study",
    translations: ["v. 学习"],
    exchange: "i:studying/3:studies",
    frq: 579,
  }),
];

const index = buildEnglishIndex(entries);

describe("normalizeEnglishWord", () => {
  it("normalizes case, spaces, and curly apostrophes", () => {
    expect(normalizeEnglishWord("  New   York ")).toBe("new york");
    expect(normalizeEnglishWord("don’t")).toBe("don't");
  });
});

describe("searchEnglishIndex", () => {
  it("finds exact English words", () => {
    expect(searchEnglishIndex(index, "bank")[0]?.id).toBe(1);
    expect(searchEnglishIndex(index, "Computer")[0]?.id).toBe(2);
  });

  it("finds word forms through exchange data", () => {
    expect(searchEnglishIndex(index, "banks")[0]?.id).toBe(1);
    expect(searchEnglishIndex(index, "paid")[0]?.id).toBe(3);
    expect(searchEnglishIndex(index, "went")[0]?.id).toBe(4);
    expect(searchEnglishIndex(index, "goes")[0]?.id).toBe(4);
  });

  it("finds lemmas and prefixes", () => {
    expect(searchEnglishIndex(index, "studying").some((hit) => hit.id === 5)).toBe(
      true,
    );
    expect(searchEnglishIndex(index, "comp")[0]?.id).toBe(2);
    expect(searchEnglishIndex(index, "pay").some((hit) => hit.id === 3)).toBe(
      true,
    );
  });

  it("returns nothing for empty or non-English input", () => {
    expect(searchEnglishIndex(index, "")).toEqual([]);
    expect(searchEnglishIndex(index, "   ")).toEqual([]);
    expect(searchEnglishIndex(index, "银行")).toEqual([]);
  });
});
