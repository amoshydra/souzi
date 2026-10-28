import { describe, expect, it } from "vitest";
import {
  definitionLines,
  styleAngleTags,
  translationLines,
  unescapeNewlines,
} from "../lib/ecdict-text";

describe("ecdict-text", () => {
  it("turns escaped newlines into real newlines", () => {
    expect(unescapeNewlines("a\\r\\nb\\nc")).toBe("a\nb\nc");
  });

  it("strips blockquote markers from definition lines", () => {
    expect(definitionLines("> Look at that! It's big.\n> Still big.")).toEqual([
      "Look at that! It's big.",
      "Still big.",
    ]);
  });

  it("renders ECDICT angle tags as dictionary brackets", () => {
    expect(styleAngleTags("<主英> = legitimize")).toBe(
      "【主英】 = legitimize",
    );
    expect(translationLines("<美> shiny")).toEqual(["【美】 shiny"]);
    expect(translationLines("existing line\n<英> dormitory")).toEqual([
      "existing line",
      "【英】 dormitory",
    ]);
  });

  it("leaves non-tag angle content untouched", () => {
    expect(styleAngleTags("a << b")).toBe("a << b");
  });
});
