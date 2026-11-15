import type { ExampleSentence } from "../types";
import { getInstalledExamplePack } from "./db";

type ExampleMap = Record<string, ExampleSentence[]>;

const cache = new Map<string, ExampleMap>();

export function mergeExamples(
  base: ExampleMap,
  extra: ExampleMap,
  limit = 4,
): ExampleMap {
  const merged: ExampleMap = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(extra)]);

  for (const key of keys) {
    const seen = new Set<string>();
    const items: ExampleSentence[] = [];

    for (const example of [...(extra[key] ?? []), ...(base[key] ?? [])]) {
      const normalized = example.text.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      items.push(example);
      if (items.length >= limit) break;
    }

    if (items.length > 0) merged[key] = items;
  }

  return merged;
}

async function loadBundledExamples(language: "en" | "zh"): Promise<ExampleMap> {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/examples-${language}.json`,
    );
    if (!response.ok) return {};
    return ((await response.json()) as ExampleMap) ?? {};
  } catch {
    return {};
  }
}

export async function loadExampleSentences(
  language: "en" | "zh",
): Promise<ExampleMap> {
  const cached = cache.get(language);
  if (cached) return cached;

  const bundled = await loadBundledExamples(language);
  const installed = await getInstalledExamplePack();
  const examples = installed?.examples
    ? mergeExamples(bundled, installed.examples, 4)
    : bundled;

  cache.set(language, examples);
  return examples;
}

export function clearExampleSentenceCache(): void {
  cache.clear();
}

export function exampleSentencesFor(
  map: ExampleMap,
  key: string,
): ExampleSentence[] {
  return map[key.trim().toLowerCase()] ?? [];
}

export type ExampleAttribution =
  | "tatoebaAndStarter"
  | "tatoeba"
  | "starter"
  | null;

export function exampleAttribution(
  examples: ExampleSentence[],
): ExampleAttribution {
  const sources = new Set(
    examples
      .map((example) => example.source?.toLowerCase())
      .filter(Boolean),
  );
  const tatoeba = sources.has("tatoeba");
  const starter = sources.has("starter");

  if (tatoeba && starter) return "tatoebaAndStarter";
  if (tatoeba) return "tatoeba";
  return examples.length > 0 ? "starter" : null;
}

export function exchangeForms(exchange: string): string[] {
  const forms = new Set<string>();

  for (const part of exchange.split("/")) {
    const pieces = part.split(":");
    const value = pieces[1];
    if (!value) continue;
    for (const raw of value.split(/\s+/)) {
      const form = raw.trim().toLowerCase();
      if (form && form.length > 1) forms.add(form);
    }
  }

  return [...forms];
}
