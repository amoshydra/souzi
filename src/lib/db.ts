import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  DictionaryMeta,
  EnglishCoreMeta,
  EnglishEntry,
  EnglishHistoryWord,
  EnglishSavedWord,
  EnglishSearchIndex,
  Entry,
  HistoryWord,
  SearchIndex,
  UserWord,
} from "../types";
import { buildIndex } from "./indexer";
import { STARTER_ENTRIES } from "./starter";

const ENTRY_CHUNK_SIZE = 2000;

interface SouziDB extends DBSchema {
  entries: {
    key: number;
    value: Entry[];
  };
  index: {
    key: string;
    value: { name: string; data: unknown };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
  favorites: {
    key: string;
    value: UserWord;
  };
  history: {
    key: string;
    value: HistoryWord;
  };
  englishEntries: {
    key: number;
    value: EnglishEntry[];
  };
  englishIndex: {
    key: string;
    value: { name: string; data: unknown };
  };
  englishFavorites: {
    key: string;
    value: EnglishSavedWord;
  };
  englishHistory: {
    key: string;
    value: EnglishHistoryWord;
  };
}

const DB_NAME = "souzi";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<SouziDB>> | null = null;
let cachedIndex: SearchIndex | null = null;
let cachedEnglishIndex: EnglishSearchIndex | null = null;
const chunkCache = new Map<number, Entry[]>();
const englishChunkCache = new Map<number, EnglishEntry[]>();

export function getDB(): Promise<IDBPDatabase<SouziDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SouziDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains("entries")) {
            db.deleteObjectStore("entries");
          }
          db.createObjectStore("entries");
        }
        if (!db.objectStoreNames.contains("index")) {
          db.createObjectStore("index", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("favorites")) {
          db.createObjectStore("favorites", { keyPath: "simp" });
        }
        if (!db.objectStoreNames.contains("history")) {
          db.createObjectStore("history", { keyPath: "simp" });
        }
        if (!db.objectStoreNames.contains("englishEntries")) {
          db.createObjectStore("englishEntries");
        }
        if (!db.objectStoreNames.contains("englishIndex")) {
          db.createObjectStore("englishIndex", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("englishFavorites")) {
          db.createObjectStore("englishFavorites", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("englishHistory")) {
          db.createObjectStore("englishHistory", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getDictionaryMeta(): Promise<DictionaryMeta | undefined> {
  const db = await getDB();
  const record = await db.get("meta", "dictionary");
  return record?.value as DictionaryMeta | undefined;
}

export async function replaceDictionary(
  entries: Entry[],
  index: SearchIndex,
  meta: DictionaryMeta,
  onStoreProgress?: (current: number, total: number) => void,
): Promise<void> {
  const db = await getDB();

  await db.clear("entries");
  await db.clear("index");
  chunkCache.clear();
  cachedIndex = null;

  for (let i = 0; i < entries.length; i += ENTRY_CHUNK_SIZE) {
    const chunk = entries.slice(i, i + ENTRY_CHUNK_SIZE);
    await db.put("entries", chunk, Math.floor(i / ENTRY_CHUNK_SIZE));
    onStoreProgress?.(Math.min(i + ENTRY_CHUNK_SIZE, entries.length), entries.length);
  }

  const maps: Array<[string, Record<string, number[]>]> = [
    ["simp", index.simp],
    ["trad", index.trad],
    ["pinyin", index.pinyin],
    ["english", index.english],
    ["englishPrimary", index.englishPrimary],
    ["char", index.char],
  ];

  for (const [name, data] of maps) {
    await db.put("index", { name, data });
  }

  await db.put("meta", { key: "dictionary", value: meta });
}

export async function loadSearchIndex(): Promise<SearchIndex | null> {
  const db = await getDB();
  const records = await db.getAll("index");
  const byName = new Map(records.map((record) => [record.name, record.data]));

  const simp = byName.get("simp") as Record<string, number[]> | undefined;
  const trad = byName.get("trad") as Record<string, number[]> | undefined;
  const pinyin = byName.get("pinyin") as Record<string, number[]> | undefined;
  const english = byName.get("english") as Record<string, number[]> | undefined;
  const englishPrimary =
    (byName.get("englishPrimary") as Record<string, number[]> | undefined) ?? {};
  const char = byName.get("char") as Record<string, number[]> | undefined;

  if (!simp || !trad || !pinyin || !english || !char) return null;

  cachedIndex = {
    simp,
    trad,
    pinyin,
    english,
    englishPrimary,
    char,
    keys: {
      simp: Object.keys(simp).sort(),
      trad: Object.keys(trad).sort(),
      pinyin: Object.keys(pinyin).sort(),
      english: Object.keys(english).sort(),
      char: Object.keys(char).sort(),
    },
  };

  return cachedIndex;
}

export async function seedStarter(): Promise<DictionaryMeta> {
  const index = buildIndex(STARTER_ENTRIES);
  const meta: DictionaryMeta = {
    count: STARTER_ENTRIES.length,
    importedAt: new Date().toISOString(),
    source: "Starter set (original sample entries)",
    kind: "starter",
  };
  await replaceDictionary(STARTER_ENTRIES, index, meta);
  return meta;
}

export async function resetToStarter(): Promise<DictionaryMeta> {
  return seedStarter();
}

export async function getEntriesByIds(ids: number[]): Promise<Entry[]> {
  if (ids.length === 0) return [];

  const chunkIds = [
    ...new Set(ids.map((id) => Math.floor((id - 1) / ENTRY_CHUNK_SIZE))),
  ];
  const missing = chunkIds.filter((chunkId) => !chunkCache.has(chunkId));

  if (missing.length > 0) {
    const db = await getDB();
    const tx = db.transaction("entries", "readonly");
    const values = await Promise.all(
      missing.map((chunkId) => tx.store.get(chunkId)),
    );
    await tx.done;
    missing.forEach((chunkId, index) => {
      chunkCache.set(chunkId, values[index] ?? []);
    });
  }

  const byId = new Map<number, Entry>();
  for (const chunkId of chunkIds) {
    for (const entry of chunkCache.get(chunkId) ?? []) {
      byId.set(entry.id, entry);
    }
  }

  return ids
    .map((id) => byId.get(id))
    .filter((entry): entry is Entry => Boolean(entry));
}

async function entryIdForSimp(simp: string): Promise<number | undefined> {
  const index = cachedIndex ?? (await loadSearchIndex());
  return index?.simp[simp]?.[0];
}

async function entryIdForTrad(trad: string): Promise<number | undefined> {
  const index = cachedIndex ?? (await loadSearchIndex());
  return index?.trad[trad]?.[0];
}

export async function getEntryBySimp(simp: string): Promise<Entry | undefined> {
  const id = await entryIdForSimp(simp);
  if (!id) return undefined;
  const [entry] = await getEntriesByIds([id]);
  return entry;
}

export async function getEntryByTrad(trad: string): Promise<Entry | undefined> {
  const id = await entryIdForTrad(trad);
  if (!id) return undefined;
  const [entry] = await getEntriesByIds([id]);
  return entry;
}

export async function isFavorite(simp: string): Promise<boolean> {
  const db = await getDB();
  return Boolean(await db.get("favorites", simp));
}

export async function toggleFavorite(entry: Entry): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get("favorites", entry.simp);
  if (existing) {
    await db.delete("favorites", entry.simp);
    return false;
  }

  await db.put("favorites", {
    simp: entry.simp,
    trad: entry.trad,
    pinyin: entry.pinyin,
    definitions: entry.definitions.slice(0, 6),
    savedAt: Date.now(),
  });
  return true;
}

export async function listFavorites(): Promise<UserWord[]> {
  const db = await getDB();
  const favorites = await db.getAll("favorites");
  return favorites.sort((a, b) => b.savedAt - a.savedAt);
}

export async function removeFavorite(simp: string): Promise<void> {
  const db = await getDB();
  await db.delete("favorites", simp);
}

export async function addHistory(entry: Entry): Promise<void> {
  const db = await getDB();
  await db.put("history", {
    simp: entry.simp,
    trad: entry.trad,
    pinyin: entry.pinyin,
    definitions: entry.definitions.slice(0, 6),
    savedAt: Date.now(),
    viewedAt: Date.now(),
  });

  const all = await db.getAll("history");
  if (all.length > 50) {
    const sorted = all.sort((a, b) => b.viewedAt - a.viewedAt);
    const tx = db.transaction("history", "readwrite");
    for (const old of sorted.slice(50)) tx.store.delete(old.simp);
    await tx.done;
  }
}

export async function listHistory(): Promise<HistoryWord[]> {
  const db = await getDB();
  const history = await db.getAll("history");
  return history.sort((a, b) => b.viewedAt - a.viewedAt).slice(0, 20);
}

export async function removeHistory(simp: string): Promise<void> {
  const db = await getDB();
  await db.delete("history", simp);
}

export async function removeEnglishHistory(key: string): Promise<void> {
  const db = await getDB();
  await db.delete("englishHistory", key);
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await Promise.all([db.clear("history"), db.clear("englishHistory")]);
}

export async function installEnglishCore(
  entries: EnglishEntry[],
  index: EnglishSearchIndex,
  meta: EnglishCoreMeta,
): Promise<void> {
  const db = await getDB();

  await db.clear("englishEntries");
  await db.clear("englishIndex");
  englishChunkCache.clear();
  cachedEnglishIndex = null;

  for (let i = 0; i < entries.length; i += ENTRY_CHUNK_SIZE) {
    const chunk = entries.slice(i, i + ENTRY_CHUNK_SIZE);
    await db.put("englishEntries", chunk, Math.floor(i / ENTRY_CHUNK_SIZE));
  }

  await db.put("englishIndex", { name: "words", data: index.words });
  await db.put("englishIndex", { name: "variants", data: index.variants });
  await db.put("meta", { key: "ecdict", value: meta });
}

export async function loadEnglishCore(): Promise<{
  index: EnglishSearchIndex;
  meta: EnglishCoreMeta;
} | null> {
  const db = await getDB();
  const [metaRecord, records] = await Promise.all([
    db.get("meta", "ecdict"),
    db.getAll("englishIndex"),
  ]);

  if (!metaRecord) return null;

  const byName = new Map(records.map((record) => [record.name, record.data]));
  const words = byName.get("words") as Record<string, number[]> | undefined;
  const variants =
    (byName.get("variants") as Record<string, number[]> | undefined) ?? {};

  if (!words) return null;

  cachedEnglishIndex = {
    words,
    variants,
    keys: Object.keys(words).sort(),
  };

  return {
    index: cachedEnglishIndex,
    meta: metaRecord.value as EnglishCoreMeta,
  };
}

export async function getEnglishEntriesByIds(
  ids: number[],
): Promise<EnglishEntry[]> {
  if (ids.length === 0) return [];

  const chunkIds = [
    ...new Set(ids.map((id) => Math.floor((id - 1) / ENTRY_CHUNK_SIZE))),
  ];
  const missing = chunkIds.filter(
    (chunkId) => !englishChunkCache.has(chunkId),
  );

  if (missing.length > 0) {
    const db = await getDB();
    const tx = db.transaction("englishEntries", "readonly");
    const values = await Promise.all(
      missing.map((chunkId) => tx.store.get(chunkId)),
    );
    await tx.done;
    missing.forEach((chunkId, index) => {
      englishChunkCache.set(chunkId, values[index] ?? []);
    });
  }

  const byId = new Map<number, EnglishEntry>();
  for (const chunkId of chunkIds) {
    for (const entry of englishChunkCache.get(chunkId) ?? []) {
      byId.set(entry.id, entry);
    }
  }

  return ids
    .map((id) => byId.get(id))
    .filter((entry): entry is EnglishEntry => Boolean(entry));
}

export async function getEnglishEntryByWord(
  word: string,
): Promise<EnglishEntry | undefined> {
  const normalized = word.trim().toLowerCase();
  const index = cachedEnglishIndex ?? (await loadEnglishCore())?.index;
  const id = index?.words[normalized]?.[0];
  if (!id) return undefined;
  const [entry] = await getEnglishEntriesByIds([id]);
  return entry;
}

export async function toggleEnglishFavorite(
  entry: EnglishEntry,
): Promise<boolean> {
  const db = await getDB();
  const key = entry.word.toLowerCase();
  const existing = await db.get("englishFavorites", key);

  if (existing) {
    await db.delete("englishFavorites", key);
    return false;
  }

  await db.put("englishFavorites", {
    id: entry.id,
    key,
    word: entry.word,
    phonetic: entry.phonetic,
    translations: entry.translations.slice(0, 4),
    tags: entry.tags,
    savedAt: Date.now(),
  });
  return true;
}

export async function listEnglishFavorites(): Promise<EnglishSavedWord[]> {
  const db = await getDB();
  const favorites = await db.getAll("englishFavorites");
  return favorites.sort((a, b) => b.savedAt - a.savedAt);
}

export async function removeEnglishFavorite(key: string): Promise<void> {
  const db = await getDB();
  await db.delete("englishFavorites", key);
}

export async function addEnglishHistory(entry: EnglishEntry): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  await db.put("englishHistory", {
    id: entry.id,
    key: entry.word.toLowerCase(),
    word: entry.word,
    phonetic: entry.phonetic,
    translations: entry.translations.slice(0, 4),
    tags: entry.tags,
    savedAt: now,
    viewedAt: now,
  });

  const all = await db.getAll("englishHistory");
  if (all.length > 50) {
    const sorted = all.sort((a, b) => b.viewedAt - a.viewedAt);
    const tx = db.transaction("englishHistory", "readwrite");
    for (const old of sorted.slice(50)) tx.store.delete(old.key);
    await tx.done;
  }
}

export async function listEnglishHistory(): Promise<EnglishHistoryWord[]> {
  const db = await getDB();
  const history = await db.getAll("englishHistory");
  return history.sort((a, b) => b.viewedAt - a.viewedAt).slice(0, 20);
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? 0,
  };
}

export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
