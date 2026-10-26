import type { ParsedEntry } from "../types";
import { numericToDiacritics, toPlainPinyin } from "./pinyin";

const CEDICT_LINE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.*)\/$/;

function extractClassifiers(definitions: string[]): {
  definitions: string[];
  classifiers: string[];
} {
  const kept: string[] = [];
  const classifiers: string[] = [];

  for (const definition of definitions) {
    if (!definition.startsWith("CL:")) {
      kept.push(definition);
      continue;
    }

    const body = definition.slice(3).trim();
    for (const part of body.split(/[,，]/)) {
      const beforeBracket = part.split("[")[0] ?? "";
      const forms = beforeBracket.split("|");
      const classifier = forms[forms.length - 1]?.trim();
      if (classifier) classifiers.push(classifier);
    }
  }

  return { definitions: kept, classifiers };
}

export function parseCedictLine(line: string): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const match = trimmed.match(CEDICT_LINE);
  if (!match) return null;

  const [, trad, simp, numericPinyin, rawDefinitions] = match;
  if (!simp || !trad || !numericPinyin) return null;

  const allDefinitions = rawDefinitions
    .split("/")
    .map((definition) => definition.trim())
    .filter(Boolean);

  const { definitions, classifiers } = extractClassifiers(allDefinitions);
  const pinyin = numericToDiacritics(numericPinyin);

  return {
    simp,
    trad,
    pinyin,
    pinyinPlain: toPlainPinyin(pinyin),
    definitions,
    classifiers,
  };
}

export function parseCedict(
  text: string,
  onProgress?: (parsed: number, total: number) => void,
): ParsedEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: ParsedEntry[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const parsed = parseCedictLine(lines[i]);
    if (parsed) entries.push(parsed);

    if (onProgress && (i + 1) % 10000 === 0) {
      onProgress(i + 1, lines.length);
    }
  }

  onProgress?.(lines.length, lines.length);
  return entries;
}
