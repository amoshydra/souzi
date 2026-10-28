export type EntrySource = "cedict" | "starter";

export type Theme = "system" | "light" | "dark";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface Entry {
  id: number;
  simp: string;
  trad: string;
  pinyin: string;
  pinyinPlain: string;
  definitions: string[];
  classifiers: string[];
  source: EntrySource;
  hsk?: number;
  frequency?: number;
}

export interface ParsedEntry {
  simp: string;
  trad: string;
  pinyin: string;
  pinyinPlain: string;
  definitions: string[];
  classifiers: string[];
}

export interface EnglishEntry {
  id: number;
  word: string;
  phonetic: string;
  translations: string[];
  definitions: string[];
  pos: string;
  tags: string[];
  collins: number;
  oxford: number;
  bnc: number;
  frq: number;
  exchange: string;
  source: "ecdict";
}

export interface EnglishSearchIndex {
  words: Record<string, number[]>;
  variants: Record<string, number[]>;
  keys: string[];
}

export type EnglishCoreStatus = "idle" | "loading" | "ready" | "error";

export type EnglishMatchKind = "word" | "variant" | "lemma" | "prefix";

export interface EnglishSearchCandidate {
  id: number;
  match: EnglishMatchKind;
  rank: number;
}

export interface EnglishSavedWord {
  id: number;
  key: string;
  word: string;
  phonetic: string;
  translations: string[];
  tags: string[];
  savedAt: number;
}

export interface EnglishHistoryWord extends EnglishSavedWord {
  viewedAt: number;
}

export interface EnglishCoreMeta {
  count: number;
  installedAt: string;
  source: string;
  license: string;
  version: number;
}

export interface FullEnglishMeta {
  count: number;
  installedAt: string;
  size: number;
  version: string;
  schema: number;
  source?: string;
  license?: string;
  sourceCommit?: string;
}

export interface DictionaryMeta {
  count: number;
  importedAt: string;
  source: string;
  kind: "cedict" | "starter";
}

export type MatchKind = "simp" | "trad" | "pinyin" | "english" | "contains";

export interface SearchCandidate {
  id: number;
  match: MatchKind;
  rank: number;
}

export interface SearchKeys {
  simp: string[];
  trad: string[];
  pinyin: string[];
  english: string[];
  char: string[];
}

export interface SearchIndex {
  simp: Record<string, number[]>;
  trad: Record<string, number[]>;
  pinyin: Record<string, number[]>;
  english: Record<string, number[]>;
  englishPrimary: Record<string, number[]>;
  char: Record<string, number[]>;
  keys: SearchKeys;
}

export interface UserWord {
  simp: string;
  trad: string;
  pinyin: string;
  definitions: string[];
  savedAt: number;
}

export interface HistoryWord extends UserWord {
  viewedAt: number;
}

export interface ImportProgress {
  phase: "read" | "decompress" | "parse" | "index" | "store" | "done";
  current: number;
  total: number;
  message: string;
}

export type ImportWorkerMessage =
  | { type: "progress"; progress: ImportProgress }
  | { type: "done"; count: number }
  | { type: "error"; message: string };
