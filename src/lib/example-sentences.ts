export interface ExampleSentence {
  text: string;
  translation: string;
  source?: string;
}

type ExampleMap = Record<string, ExampleSentence[]>;

const cache = new Map<string, ExampleMap>();

export async function loadExampleSentences(
  language: "en" | "zh",
): Promise<ExampleMap> {
  const cached = cache.get(language);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/examples-${language}.json`,
    );
    if (!response.ok) {
      cache.set(language, {});
      return {};
    }
    const data = (await response.json()) as ExampleMap;
    cache.set(language, data ?? {});
    return data ?? {};
  } catch {
    cache.set(language, {});
    return {};
  }
}

export function exampleSentencesFor(
  map: ExampleMap,
  key: string,
): ExampleSentence[] {
  return map[key.trim().toLowerCase()] ?? [];
}

export function exampleAttribution(examples: ExampleSentence[]): string {
  const sources = new Set(
    examples.map((example) => example.source).filter(Boolean),
  );
  const tatoeba = sources.has("Tatoeba");
  const starter = sources.has("Starter");

  if (tatoeba && starter) {
    return "Examples from Tatoeba (CC BY 2.0 FR) and the starter set";
  }
  if (tatoeba) return "Examples from Tatoeba (CC BY 2.0 FR)";
  return "Starter examples";
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
