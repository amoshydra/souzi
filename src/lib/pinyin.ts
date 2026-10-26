const TONE_MARKS: Record<string, string[]> = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "ü"]);

function toneIndexFor(syllable: string): number {
  const a = syllable.indexOf("a");
  if (a >= 0) return a;

  const e = syllable.indexOf("e");
  if (e >= 0) return e;

  const ou = syllable.indexOf("ou");
  if (ou >= 0) return ou;

  for (let i = syllable.length - 1; i >= 0; i -= 1) {
    if (VOWELS.has(syllable[i])) return i;
  }
  return -1;
}

function markSyllable(raw: string): string {
  let syllable = raw.replace(/u:/gi, "ü");
  const match = syllable.match(/^([a-zA-Zü:]+)([1-5])$/);
  if (!match) return syllable.replace(/[1-5]$/, "");

  const body = match[1];
  const tone = Number(match[2]);
  if (tone === 5 || tone === 0) return body;

  const index = toneIndexFor(body);
  if (index < 0) return body;

  const vowel = body[index];
  const marks = TONE_MARKS[vowel];
  if (!marks) return body;

  syllable = body.slice(0, index) + marks[tone] + body.slice(index + 1);
  return syllable;
}

/** Convert CC-CEDICT numeric pinyin ("yin2 hang2") to tone marks ("yín háng"). */
export function numericToDiacritics(pinyin: string): string {
  return pinyin
    .trim()
    .split(/\s+/)
    .map(markSyllable)
    .join(" ");
}

/** Convert pinyin to a search key: lowercase, toneless, no spaces, ü as v. */
export function toPlainPinyin(pinyin: string): string {
  return pinyin
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/ü/g, "v")
    .normalize("NFD")
    // ü decomposes to u + combining diaeresis; catch tone-marked forms too.
    .replace(/u\u0308/g, "v")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[1-5]/g, "")
    .replace(/[^a-zv]/g, "");
}

/** Normalize a user's pinyin query ("nǐ hǎo", "ni3hao3", "nv3") to a lookup key. */
export function normalizePinyinQuery(query: string): string {
  return toPlainPinyin(query);
}
