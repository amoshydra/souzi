# Ciqiao 词桥

An offline-first English–Chinese dictionary PWA. It bundles a filtered ECDICT core for English→Chinese and imports CC-CEDICT locally for full Chinese→English coverage.

**Ciqiao does not redistribute CC-CEDICT.** You download the official export from MDBG and import it locally. The file is parsed in a Web Worker and stored in IndexedDB; it never leaves the device. The bundled ECDICT core is MIT licensed.

## Screens

| Home | Search |
| --- | --- |
| ![Ciqiao home screen](docs/home-desktop.png) | ![Searching for bank](docs/search-desktop.png) |

| Entry | Mobile |
| --- | --- |
| ![The entry for 银行](docs/entry-desktop.png) | ![Ciqiao on a phone](docs/home-mobile.png) |

| English search | English entry |
| --- | --- |
| ![Searching for hello in both directions](docs/english-search.jpg) | ![The English entry for bank](docs/english-entry.jpg) |

<p align="center"><img src="docs/about.jpg" alt="About Ciqiao" width="720"></p>

## What works

- English→Chinese from a bundled 30,000-entry ECDICT core, including IPA, Chinese translations, exam tags, and English definitions.
- Chinese→English from a local CC-CEDICT import (`.txt.gz`, `.txt`, or `.zip`).
- Look up by simplified/traditional characters, pinyin (with or without tones), or English.
- Entry pages with pinyin, HSK level, classifiers, character breakdown, and text-to-speech.
- Favorites and search history for both directions, stored locally.
- Installable PWA with an offline app shell.
- Starter set of 36 original Chinese sample words so Chinese search works before importing.
- Dark/light/system theme.
- No server, no account, no tracking.

## Run it

```bash
npm install
npm run dev
```

Open the local URL. The starter set is seeded on first launch.

To test the production PWA:

```bash
npm run build
npm run preview
```

## Add the full Chinese dictionary

English→Chinese is already included. This import adds the full Chinese→English side.

1. Open **Add dictionary** in the app.
2. Download the official CC-CEDICT export:
   <https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz>
3. Return to Ciqiao and choose the downloaded `.txt.gz`.
4. Wait for parsing and indexing. The app then works offline.

The raw CC-CEDICT file is about 4 MB compressed. With both dictionaries installed, entries and indexes use roughly 40–60 MB in IndexedDB, depending on the browser. The bundled ECDICT core is about 2.8 MB compressed and installs automatically on first launch.

## Why import instead of bundling?

CC-CEDICT is licensed CC BY-SA 4.0. Distributing a modified copy or a derived database triggers share-alike obligations. Local import keeps Ciqiao free of that redistribution and keeps the data under the user's control.

ECDICT is MIT licensed, so a frequency-filtered core can be bundled directly. The app still shows attribution and links to both licenses.

The ECDICT core is generated with:

```bash
npm run data:ecdict -- /path/to/ecdict.csv
```

That script selects exam-tagged / Collins / Oxford words first, then the most frequent remaining words, up to 30,000 entries.

## Architecture

```
src/
  components/       UI views
  data/             HSK levels and word-frequency ranks
  lib/
    cedict.ts       CC-CEDICT line parser
    pinyin.ts       numeric pinyin -> tone marks, search normalization
    indexer.ts      simplified/traditional/pinyin/English/character indexes
    search.ts       Chinese query detection, ranking, prefix and lemma search
    english.ts      ECDICT index build and English query search
    english-core.ts lazy-load the bundled ECDICT core
    db.ts           IndexedDB schema and dictionary/user data helpers
    starter.ts      original sample entries
  workers/
    import.worker.ts  decompress, parse, index, and store CC-CEDICT
public/data/
  ecdict-core.json.gz  filtered ECDICT core (MIT)
scripts/
  build-ecdict-core.mjs  regenerate the bundled core
```

Search uses precomputed lookup maps:

- `simp` / `trad`: exact and prefix Chinese headword lookup.
- `pinyin`: toneless pinyin, with `ü` indexed as both `v` and `u`.
- `english`: tokens from Chinese entry glosses, with query-time lemma candidates (`studies` -> `study`, `running` -> `run`).
- `char`: every character in every headword, for "words containing this character".
- ECDICT `words` / `variants`: exact English headwords plus inflected forms from the ECDICT `exchange` field (`went` -> `go`, `paid` -> `pay`).

Entries and indexes live in IndexedDB. The ECDICT core is downloaded as a static gzip asset on first launch, then installed into IndexedDB and cached by the service worker for offline use.

## Tests

```bash
npm test
```

Covers pinyin conversion, CC-CEDICT parsing, Chinese and English index building, and search behavior against the starter set and a small ECDICT fixture.

## Data licenses

- **ECDICT**: MIT, [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT). A filtered 30,000-entry core is bundled.
- **CC-CEDICT**: CC BY-SA 4.0, MDBG and contributors. Imported by the user; not bundled.
- **HSK 3.0 word list**: MIT, [ivankra/hsk30](https://github.com/ivankra/hsk30).
- **Word frequency ranks**: MIT, [jieba](https://github.com/fxsjy/jieba).
- **Starter set**: original sample entries written for Ciqiao.
- **App code**: MIT. See `LICENSE` and `THIRD_PARTY_LICENSES.md`.

## Deployment

Any static host works. Cloudflare Pages, Netlify, and GitHub Pages are fine. Use a stable origin so IndexedDB data survives deployments. If you deploy under a subpath (for example a GitHub Pages project site), set Vite's `base` and update the manifest `start_url`/`scope` and icon paths to match; the default config assumes the domain root.

Do not add a server-side proxy that downloads CC-CEDICT on behalf of users. That turns Ciqiao into a distributor. Keep the import local.

## Roadmap

- Full ECDICT import for power users, plus common phrasal verbs and idioms.
- Example sentence pairs (Tatoeba).
- Stroke-order data.
- Handwriting and OCR.
- Flashcards / Anki export.
- Optional AI explanations grounded in the imported dictionary.
