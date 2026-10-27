#!/usr/bin/env node
/**
 * Build the bundled ECDICT core.
 *
 * ECDICT is MIT licensed. This script selects a learner-friendly subset:
 * exam-tagged / Collins / Oxford words first, then the most frequent remaining
 * words, up to ECDICT_CORE_MAX entries (default 30,000).
 *
 * Usage:
 *   pnpm run data:ecdict -- /path/to/ecdict.csv
 *
 * Download the source CSV from:
 *   https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv
 *
 * When changing the selection rules or max entry count, bump
 * ECDICT_CORE_VERSION in src/lib/english-core.ts so installed clients refresh
 * their IndexedDB copy.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { parse } from "csv-parse/sync";

const input = resolve(process.argv[2] ?? "ecdict.csv");
const output = resolve("public/data/ecdict-core.json.gz");
const maxEntries = Number(process.env.ECDICT_CORE_MAX ?? 30000);

if (!Number.isFinite(maxEntries) || maxEntries < 1000) {
  throw new Error("ECDICT_CORE_MAX must be a number of at least 1000.");
}

const csv = readFileSync(input, "utf8");
const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
});

const WORD_RE = /^[A-Za-z][A-Za-z' .-]*$/;
const CJK_RE = /[\u3400-\u9fff]/;

// ECDICT often has no frequency rank or exam tag for common multi-word
// expressions. Keep a targeted set so "give up" and "look up" do not fall out
// of the core while rare single words make the cut.
const COMMON_PHRASES = new Set(
  [
    "a lot of",
    "according to",
    "after all",
    "again and again",
    "ahead of",
    "all at once",
    "all of a sudden",
    "all over",
    "as a matter of fact",
    "as a result",
    "as far as",
    "as if",
    "as long as",
    "as soon as",
    "as usual",
    "as well",
    "as well as",
    "at all",
    "at first",
    "at last",
    "at least",
    "at once",
    "at present",
    "at the same time",
    "be able to",
    "be afraid of",
    "be fond of",
    "be interested in",
    "be proud of",
    "be used to",
    "because of",
    "by accident",
    "by chance",
    "by mistake",
    "by the way",
    "carry on",
    "catch up",
    "come across",
    "come back",
    "come down",
    "come from",
    "come in",
    "come on",
    "come out",
    "come up",
    "come up with",
    "depend on",
    "die out",
    "dress up",
    "each other",
    "end up",
    "enjoy oneself",
    "even if",
    "even though",
    "ever since",
    "face to face",
    "fall asleep",
    "fall behind",
    "fall down",
    "fall in love",
    "far away",
    "find out",
    "first of all",
    "focus on",
    "for example",
    "for instance",
    "for the first time",
    "from now on",
    "get along",
    "get away",
    "get back",
    "get down",
    "get in",
    "get off",
    "get on",
    "get out",
    "get over",
    "get ready",
    "get rid of",
    "get together",
    "get up",
    "give away",
    "give back",
    "give in",
    "give off",
    "give out",
    "give up",
    "go away",
    "go back",
    "go by",
    "go down",
    "go on",
    "go out",
    "go over",
    "go through",
    "go up",
    "grow up",
    "hand in",
    "hand out",
    "hang on",
    "hang up",
    "have a good time",
    "have fun",
    "have to",
    "hear from",
    "hear of",
    "hold on",
    "hold up",
    "how about",
    "hurry up",
    "in a hurry",
    "in addition",
    "in charge of",
    "in danger",
    "in fact",
    "in front of",
    "in general",
    "in order to",
    "in other words",
    "in public",
    "in return",
    "in short",
    "in spite of",
    "in the end",
    "in the future",
    "in time",
    "instead of",
    "keep on",
    "keep up",
    "kind of",
    "laugh at",
    "look after",
    "look at",
    "look for",
    "look forward to",
    "look like",
    "look out",
    "look up",
    "look up to",
    "make a difference",
    "make friends",
    "make fun of",
    "make sure",
    "make up",
    "make up for",
    "make use of",
    "mix up",
    "more or less",
    "next to",
    "no longer",
    "of course",
    "on behalf of",
    "on foot",
    "on purpose",
    "on time",
    "once again",
    "once upon a time",
    "one another",
    "or else",
    "over and over",
    "pay attention to",
    "pick up",
    "point out",
    "put away",
    "put down",
    "put off",
    "put on",
    "put out",
    "put up",
    "quite a few",
    "rather than",
    "refer to",
    "regard as",
    "right away",
    "run away",
    "run out of",
    "set up",
    "show off",
    "shut up",
    "so far",
    "so that",
    "sooner or later",
    "stand up",
    "stay up",
    "such as",
    "take after",
    "take away",
    "take care of",
    "take off",
    "take on",
    "take out",
    "take part in",
    "take place",
    "take up",
    "talk about",
    "thanks to",
    "think about",
    "think of",
    "throw away",
    "try on",
    "try out",
    "turn down",
    "turn off",
    "turn on",
    "turn out",
    "turn up",
    "up to",
    "used to",
    "wait for",
    "wake up",
    "work out",
    "worry about",
    "write down",
  ].map((phrase) => phrase.toLowerCase()),
);

function splitLines(value) {
  return String(value ?? "")
    .replace(/\\r\\n/g, "\\n")
    .split(/\\n|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toInt(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bestRankFor(row) {
  const ranks = [toInt(row.bnc), toInt(row.frq)].filter((rank) => rank > 0);
  return ranks.length > 0 ? Math.min(...ranks) : Number.MAX_SAFE_INTEGER;
}

function informationScore(candidate) {
  return (
    candidate.translations.length * 10 +
    candidate.definitions.length * 2 +
    candidate.tags.length * 3 +
    candidate.collins * 2 +
    candidate.oxford * 2 +
    (candidate.phonetic ? 2 : 0) +
    (candidate.exchange ? 1 : 0)
  );
}

function compareByUsefulness(a, b) {
  return (
    a.bestRank - b.bestRank ||
    b.collins - a.collins ||
    b.oxford - a.oxford ||
    b.tags.length - a.tags.length ||
    a.word.length - b.word.length ||
    a.word.localeCompare(b.word)
  );
}

const byWord = new Map();

for (const row of rows) {
  const word = String(row.word ?? "").trim();
  if (!word || word.length > 40 || !WORD_RE.test(word)) continue;

  const translations = splitLines(row.translation).filter(
    (line) => !line.startsWith("[网络]"),
  );
  if (!translations.some((line) => CJK_RE.test(line))) continue;

  const tags = String(row.tag ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const collins = toInt(row.collins);
  const oxford = toInt(row.oxford);
  const bnc = toInt(row.bnc);
  const frq = toInt(row.frq);
  const bestRank = bestRankFor(row);

  const candidate = {
    word,
    phonetic: String(row.phonetic ?? "").trim(),
    translations: translations.slice(0, 8),
    definitions: splitLines(row.definition).slice(0, 4),
    pos: String(row.pos ?? "").trim(),
    tags,
    collins,
    oxford,
    bnc,
    frq,
    exchange: String(row.exchange ?? "").trim(),
    bestRank,
    educational:
      collins > 0 ||
      oxford > 0 ||
      tags.length > 0 ||
      COMMON_PHRASES.has(word.toLowerCase()),
  };
  candidate.infoScore = informationScore(candidate);

  const current = byWord.get(word);
  if (
    !current ||
    candidate.infoScore > current.infoScore ||
    (candidate.infoScore === current.infoScore &&
      candidate.bestRank < current.bestRank)
  ) {
    byWord.set(word, candidate);
  }
}

const candidates = [...byWord.values()];
const educational = candidates
  .filter((candidate) => candidate.educational)
  .sort(compareByUsefulness);
const ranked = candidates
  .filter(
    (candidate) => !candidate.educational && candidate.bestRank < 1e9,
  )
  .sort(compareByUsefulness);

const selected = [...educational, ...ranked].slice(0, maxEntries);
selected.sort((a, b) =>
  a.word.localeCompare(b.word, "en", { sensitivity: "base" }),
);

const entries = selected.map((candidate, index) => ({
  id: index + 1,
  word: candidate.word,
  phonetic: candidate.phonetic,
  translations: candidate.translations,
  definitions: candidate.definitions,
  pos: candidate.pos,
  tags: candidate.tags,
  collins: candidate.collins,
  oxford: candidate.oxford,
  bnc: candidate.bnc,
  frq: candidate.frq,
  exchange: candidate.exchange,
}));

const payload = {
  version: 1,
  source: "ECDICT",
  license: "MIT",
  generatedAt: new Date().toISOString(),
  count: entries.length,
  entries,
};

mkdirSync(resolve("public/data"), { recursive: true });
writeFileSync(
  output,
  gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 }),
);

console.log(
  [
    `rows: ${rows.length.toLocaleString()}`,
    `candidates: ${candidates.length.toLocaleString()}`,
    `educational: ${educational.length.toLocaleString()}`,
    `ranked: ${ranked.length.toLocaleString()}`,
    `selected: ${entries.length.toLocaleString()}`,
    `output: ${(statSync(output).size / 1024 / 1024).toFixed(2)} MB`,
  ].join("\n"),
);
