import { describe, expect, it } from "vitest";
import { parseCedict, parseCedictLine } from "../lib/cedict";

describe("parseCedictLine", () => {
  it("parses a normal entry and extracts classifiers", () => {
    const entry = parseCedictLine(
      "銀行 银行 [yin2 hang2] /bank/CL:家[jia1],個|个[ge4]/",
    );

    expect(entry).toEqual({
      simp: "银行",
      trad: "銀行",
      pinyin: "yín háng",
      pinyinPlain: "yinhang",
      definitions: ["bank"],
      classifiers: ["家", "个"],
    });
  });

  it("parses multiple definitions and no classifier", () => {
    const entry = parseCedictLine("你好 你好 [ni3 hao3] /hello/hi/");
    expect(entry?.definitions).toEqual(["hello", "hi"]);
    expect(entry?.classifiers).toEqual([]);
    expect(entry?.pinyin).toBe("nǐ hǎo");
  });

  it("skips comments and malformed lines", () => {
    expect(parseCedictLine("# a comment")).toBeNull();
    expect(parseCedictLine("not a cedict line")).toBeNull();
    expect(parseCedictLine("")).toBeNull();
  });
});

describe("parseCedict", () => {
  it("parses a small document and reports progress", () => {
    const text = [
      "# comment",
      "中國 中国 [Zhong1 guo2] /China/",
      "銀行 银行 [yin2 hang2] /bank/",
      "bad line",
    ].join("\n");

    const entries = parseCedict(text);
    expect(entries).toHaveLength(2);
    expect(entries[0].simp).toBe("中国");
    expect(entries[1].simp).toBe("银行");
  });
});
