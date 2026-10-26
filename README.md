# Ciqiao 词桥

An offline-first English–Chinese dictionary PWA. Chinese headwords, pinyin, and English glosses, with no backend and no bundled CC-CEDICT data.

**Ciqiao does not redistribute CC-CEDICT.** You download the official export from MDBG and import it locally. The file is parsed in a Web Worker and stored in IndexedDB; it never leaves the device.

## Screens

| Home | Search |
| --- | --- |
| ![Ciqiao home screen](docs/home-desktop.png) | ![Searching for bank](docs/search-desktop.png) |

| Entry | Mobile |
| --- | --- |
| ![The entry for 银行](docs/entry-desktop.png) | ![Ciqiao on a phone](docs/home-mobile.png) |

## What works

- Import CC-CEDICT from `.txt.gz`, `.txt`, or `.zip` in the browser.
- Look up by simplified/traditional characters, pinyin (with or without tones), or English.
- Entry pages with pinyin, HSK level, classifiers, character breakdown, and text-to-speech.
- Favorites and search history, stored locally.
- Installable PWA with an offline app shell.
- Starter set of 36 original sample words so the app is usable before importing.
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

## Add the full dictionary

1. Open **Add dictionary** in the app.
2. Download the official CC-CEDICT export:
   <https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz>
3. Return to Ciqiao and choose the downloaded `.txt.gz`.
4. Wait for parsing and indexing. The app then works offline.

The raw file is about 4 MB compressed. Parsed entries and search indexes are roughly 30–60 MB in IndexedDB, depending on the browser.

## Why import instead of bundling?

CC-CEDICT is licensed CC BY-SA 4.0. Distributing a modified copy or a derived database triggers share-alike obligations. Local import keeps Ciqiao free of that redistribution and keeps the data under the user's control.

The app still shows attribution and a link to the license.

## Architecture

```
src/
  components/       UI views
  lib/
    cedict.ts       CC-CEDICT line parser
    pinyin.ts       numeric pinyin -> tone marks, search normalization
    indexer.ts      simplified/traditional/pinyin/English/character indexes
    search.ts       query detection, ranking, prefix and lemma search
    db.ts           IndexedDB schema and dictionary/user data helpers
    starter.ts      original sample entries
  workers/
    import.worker.ts  decompress, parse, index, and store in the background
```

Search uses precomputed lookup maps:

- `simp` / `trad`: exact and prefix headword lookup.
- `pinyin`: toneless pinyin, with `ü` indexed as both `v` and `u`.
- `english`: tokens from English glosses, with query-time lemma candidates (`studies` -> `study`, `running` -> `run`).
- `char`: every character in every headword, for "words containing this character".

Entries and indexes live in IndexedDB. No full-text engine is required for the current dataset; the precomputed maps are faster and smaller.

## Tests

```bash
npm test
```

Covers pinyin conversion, CC-CEDICT parsing, index building, and search behavior against the starter set.

## Data licenses

- **CC-CEDICT**: CC BY-SA 4.0, MDBG and contributors. Imported by the user; not bundled.
- **HSK 3.0 word list**: MIT, [ivankra/hsk30](https://github.com/ivankra/hsk30).
- **Word frequency ranks**: MIT, [jieba](https://github.com/fxsjy/jieba).
- **Starter set**: original sample entries written for Ciqiao.
- **App code**: MIT. See `LICENSE` and `THIRD_PARTY_LICENSES.md`.

## Deployment

Any static host works. Cloudflare Pages, Netlify, and GitHub Pages are fine. Use a stable origin so IndexedDB data survives deployments. If you deploy under a subpath (for example a GitHub Pages project site), set Vite's `base` and update the manifest `start_url`/`scope` and icon paths to match; the default config assumes the domain root.

Do not add a server-side proxy that downloads CC-CEDICT on behalf of users. That turns Ciqiao into a distributor. Keep the import local.

## Roadmap

- Optional ECDICT import for richer English→Chinese coverage.
- Stroke-order data.
- Handwriting and OCR.
- Flashcards / Anki export.
- Optional AI explanations grounded in the imported dictionary.
