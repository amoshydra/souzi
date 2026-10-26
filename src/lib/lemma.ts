/** Small English suffix stripper used for query-time lemma candidates. */
export function lemmaCandidates(word: string): string[] {
  const out = new Set<string>([word]);
  const add = (candidate: string) => {
    if (candidate.length > 1) out.add(candidate);
  };

  if (word.endsWith("'s")) add(word.slice(0, -2));

  if (word.endsWith("ies")) add(`${word.slice(0, -3)}y`);
  if (word.endsWith("ves")) add(`${word.slice(0, -3)}f`);
  if (word.endsWith("es")) add(word.slice(0, -2));
  if (word.endsWith("s") && !word.endsWith("ss")) add(word.slice(0, -1));

  if (word.endsWith("ing")) {
    const base = word.slice(0, -3);
    add(base);
    add(`${base}e`);
    if (base.length > 2 && base.at(-1) === base.at(-2)) add(base.slice(0, -1));
  }

  if (word.endsWith("ed")) {
    const base = word.slice(0, -2);
    add(base);
    add(`${base}e`);
    if (base.length > 2 && base.at(-1) === base.at(-2)) add(base.slice(0, -1));
  }

  if (word.endsWith("ly")) add(word.slice(0, -2));
  if (word.endsWith("er")) add(word.slice(0, -2));
  if (word.endsWith("est")) add(word.slice(0, -3));

  return [...out];
}
