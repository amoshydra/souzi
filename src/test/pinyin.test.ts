import { describe, expect, it } from "vitest";
import {
  normalizePinyinQuery,
  numericToDiacritics,
  toPlainPinyin,
} from "../lib/pinyin";

describe("numericToDiacritics", () => {
  it("converts the common a/e/ou/last-vowel cases", () => {
    expect(numericToDiacritics("yin2 hang2")).toBe("yín háng");
    expect(numericToDiacritics("ni3 hao3")).toBe("nǐ hǎo");
    expect(numericToDiacritics("xue2 xi2")).toBe("xué xí");
    expect(numericToDiacritics("zhong1 guo2")).toBe("zhōng guó");
    expect(numericToDiacritics("liu2")).toBe("liú");
    expect(numericToDiacritics("gui4")).toBe("guì");
    expect(numericToDiacritics("shui3")).toBe("shuǐ");
    expect(numericToDiacritics("er2")).toBe("ér");
  });

  it("handles ü and neutral tone", () => {
    expect(numericToDiacritics("lu:4")).toBe("lǜ");
    expect(numericToDiacritics("nu:3")).toBe("nǚ");
    expect(numericToDiacritics("ma5")).toBe("ma");
    expect(numericToDiacritics("r5")).toBe("r");
  });
});

describe("toPlainPinyin", () => {
  it("removes tones, spaces, and punctuation", () => {
    expect(toPlainPinyin("yín háng")).toBe("yinhang");
    expect(toPlainPinyin("nǐ hǎo")).toBe("nihao");
    expect(toPlainPinyin("nǚ")).toBe("nv");
    expect(toPlainPinyin("lü4")).toBe("lv");
    expect(toPlainPinyin("xi'an")).toBe("xian");
  });
});

describe("normalizePinyinQuery", () => {
  it("accepts tone marks, tone numbers, and plain input", () => {
    expect(normalizePinyinQuery("ni3hao3")).toBe("nihao");
    expect(normalizePinyinQuery("Nǐ hǎo")).toBe("nihao");
    expect(normalizePinyinQuery("nv3")).toBe("nv");
    expect(normalizePinyinQuery("nu:3")).toBe("nv");
    expect(normalizePinyinQuery("yinhang")).toBe("yinhang");
  });
});
