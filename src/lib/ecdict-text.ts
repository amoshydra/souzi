/**
 * ECDICT ships its text with a few artifacts that must not reach the screen:
 *
 * - Literal "\n" / "\r\n" escape sequences in definitions (real newlines were
 *   double-escaped before the CSV was built).
 * - Markdown blockquote remnants: lines starting with ">" left over from the
 *   upstream wiki-style source text.
 * - Angle-bracket usage tags in Chinese translations, e.g. "<英>" (British
 *   usage), "<主美>" (chiefly American). We turn them into the standard
 *   Chinese dictionary bracket style "【英】" so they render as text, not HTML.
 */

const ESCAPED_NEWLINE = /\\r\\n|\\n/g;

const MAX_TAG_LENGTH = 6;

export function unescapeNewlines(value: string): string {
  return value.replace(ESCAPED_NEWLINE, "\n");
}

export function styleAngleTags(value: string): string {
  return value.replace(
    new RegExp(`<([^<>]{1,${MAX_TAG_LENGTH}})>`, "g"),
    (_match, tag: string) => `【${tag.trim()}】`,
  );
}

export function stripQuoteMarkers(value: string): string {
  return value
    .split("\n")
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n");
}

/** Clean a Chinese translation field and split it into display lines. */
export function translationLines(value: string): string[] {
  return unescapeNewlines(value)
    .split("\n")
    .map((line) => styleAngleTags(line).trim())
    .filter(Boolean);
}

/** Clean an English definition field and split it into display lines. */
export function definitionLines(value: string): string[] {
  return stripQuoteMarkers(unescapeNewlines(value))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
