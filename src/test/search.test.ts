import { describe, expect, it } from "vitest";
import { buildIndex } from "../lib/indexer";
import { searchIndex, suggestPinyinSpellings } from "../lib/search";
import { STARTER_ENTRIES } from "../lib/starter";

const index = buildIndex(STARTER_ENTRIES);

function simps(query: string): string[] {
  return searchIndex(index, query).map(
    (candidate) => STARTER_ENTRIES.find((entry) => entry.id === candidate.id)?.simp ?? "",
  );
}

describe("searchIndex", () => {
  it("finds exact simplified and traditional Chinese", () => {
    expect(simps("银行")[0]).toBe("银行");
    expect(simps("銀行")[0]).toBe("银行");
    expect(simps("中国")[0]).toBe("中国");
    expect(simps("中國")[0]).toBe("中国");
  });

  it("finds by pinyin with and without tones", () => {
    expect(simps("yinhang")[0]).toBe("银行");
    expect(simps("yín háng")[0]).toBe("银行");
    expect(simps("ni3hao3")[0]).toBe("你好");
    expect(simps("nihao")[0]).toBe("你好");
  });

  it("finds by English gloss and lemma", () => {
    expect(simps("bank")[0]).toBe("银行");
    expect(simps("hello")[0]).toBe("你好");
    expect(simps("study")[0]).toBe("学习");
    expect(simps("studies")[0]).toBe("学习");
    expect(simps("China")[0]).toBe("中国");
  });

  it("finds words containing a character", () => {
    expect(simps("銀")).toContain("银行");
    expect(simps("银")).toContain("银行");
  });

  it("suggests near pinyin spellings", () => {
    expect(suggestPinyinSpellings(index, "yinhng")).toContain("yinhang");
    expect(suggestPinyinSpellings(index, "yinhang")).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchIndex(index, "")).toEqual([]);
    expect(searchIndex(index, "   ")).toEqual([]);
  });
});
