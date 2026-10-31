# Localisation and accessibility plan

Status: implemented — all three locales (English, Simplified Chinese, Traditional Chinese)
Implementation notes: [`docs/i18n.md`](i18n.md). Catalogs are typed TypeScript modules (not JSON) so translators get comments and missing keys fail the build. Locale catalogs and secondary routes are code-split; English remains the in-bundle fallback.
Scope: web/PWA and the Android WebView UI. Dictionary content (ECDICT, CC-CEDICT, Tatoeba, WordNet) is not translated.

## 1. What the app does today

- React 19 + Vite + Capacitor. No router library, no state library, no i18n library.
- All UI copy is inline English across 15 components, `App.tsx`, several hooks, the import worker, and the Android plugins.
- `<html lang="en">` is static, `<title>` is static, and the PWA manifest declares `lang: "en"`.
- There is no language preference, no locale-aware number/date formatting, and no translated metadata.

Existing strengths worth keeping:

- rem/em based type scale and a large default size.
- Visible `:focus-visible` styling, `sr-only`, reduced-motion handling.
- `role="progressbar"`, `aria-live`, and `aria-label` in several places.
- Semantic `<header>`, `<main>`, `<nav>` landmarks.
- No tracking and no server dependency, so locale bundles can be fully offline.

### Audit findings

A Lighthouse/axe pass reports accessibility 100, but that is misleading. Automated checks do not cover SPA focus management, live-region scope, language-of-parts, or contrast created with `color-mix()` and translucent surfaces.

Confirmed issues:

| Area | Evidence | Impact |
| --- | --- | --- |
| Accessible name mismatch | Lighthouse flags the brand button (`aria-label="Souzi home"` vs visible “字 Souzi 搜字”) and search result cards (`aria-label="Open English entry dropout"` hides the definition). | Screen reader users lose visible content. |
| No route focus management | After opening a result, `document.activeElement` is `<body>`; focus stays on the removed button. | Screen reader and keyboard users do not know the page changed. |
| Over-broad live region | `section.results-section` has `aria-live="polite"` and contains every result card. | Every search announces the whole result list, not just the count. |
| Missing heading structure | Home has no `h1`; result group headers are `<span>`; entry panels are `<div class="panel-kicker">`; About skips from `h1` to `h3`; Setup renders two `h1`s. | Heading navigation is broken. |
| Static language metadata | `<html lang="en">`; Chinese translations, pinyin, and English/Chinese example sentences are untagged. | Wrong TTS voice and pronunciation; WCAG 3.1.2. |
| Modal is not modal | `ImportView` has `role="dialog"`/`aria-modal` but no focus trap, no initial focus, no Escape handling, no focus restore. | Keyboard users can tab behind the dialog. |
| Contrast | Light theme: `--muted` #6b7872 on `--bg` is 4.16:1; on `--surface-2` 3.91:1. `--gold` on `--gold-soft` is 3.22:1. `--vermilion` on `--vermilion-soft` is 3.99:1. 82%-opacity muted text is lower still. | Normal text fails WCAG AA 1.4.3. |
| Tiny UI text | Badges are 0.5625rem (~10px); kickers and fine print 0.625–0.6875rem. | Hard to read for low-vision users. |
| Focus ring | Global ring is ~2.26:1; the search input ring is ~1.22:1. | Focus is hard to see. |
| Progress semantics | The full-download progress bar in Setup has no `aria-valuenow`; the download banner puts `role="status"` on a container with buttons and a progress bar. | Screen readers get incomplete or noisy status. |
| File inputs | `.sr-only` file inputs are still tabbable and have no label. | Keyboard users land on an invisible control. |
| Translucent sticky surfaces | Header uses 82% background with blur; bottom nav 88%. | Text contrast depends on content scrolling behind it. |

## 2. Recommended approach

### Locales

Recommended order:

1. **English (`en`)** — source of truth.
2. **Simplified Chinese (`zh-Hans`)** — highest value for an English–Chinese dictionary.
3. **Traditional Chinese (`zh-Hant`)** — separate reviewed catalog, phase 2. Do not ship a mechanical OpenCC conversion without review; terminology differs (設定/设置, 詞典/词典, 網路/网络, 儲存/保存).

Implemented decision: all three locales shipped together, with separate reviewed
Simplified and Traditional catalogs.

Do not add more locales until the extraction and review workflow is stable.

The UI language is independent of dictionary direction and TTS language. A Chinese UI must still search English and speak English words with an English voice.

### Library

Use **`i18next` + `react-i18next`** with **bundled resources** (no HTTP backend).

Why:

- Correct plural handling via `Intl.PluralRules` (English one/other, Chinese other only).
- Interpolation and rich-text support without hand-rolled parsing.
- Mature React integration: `useTranslation()` re-renders on language change.
- Type-safe keys via `CustomTypeOptions`, so a missing key is a TypeScript error.
- Small enough for an offline app; the dictionary data dwarfs the runtime.

Alternatives:

- **Custom typed catalog + `Intl`** — ~250 lines, zero dependencies, fits the hand-rolled style. Viable for two locales, but you own plural, interpolation, rich text, and provider behavior. Choose this only if avoiding dependencies is a hard requirement.
- **FormatJS/react-intl** — excellent ICU support, but heavier and more tooling than this app needs.

### Principles

- Translate UI chrome and system messages, never dictionary data.
- Store **keys/codes**, not translated strings, in React state, IndexedDB, workers, and native bridges. Otherwise a language switch leaves stale English.
- One complete sentence per key. No concatenated fragments; word order differs in Chinese.
- Use placeholders (`{{count}}`, `{{word}}`) and i18next plural keys; format numbers and dates with `Intl`.
- Keep proper nouns and product names: Souzi, 搜字, HSK, CC-CEDICT, ECDICT, Tatoeba, WordNet, Wi-Fi, Android, GitHub.
- Use plain, direct Chinese. Match the existing English tone rather than translating literally.

## 3. Architecture

### Runtime

Add `src/i18n/`:

```
src/i18n/
  index.ts          i18next init, locale detection, preference storage
  i18n.d.ts         CustomTypeOptions
  format.ts         locale-aware number/date/byte formatting
  errors.ts         AppError + error codes
  locales/
    en.json
    zh-Hans.json
    zh-Hant.json
```

`main.tsx` imports `./i18n` before rendering. Initialize with `initImmediate: false` and bundled resources so the first paint is already in the right language.

```ts
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-Hans": { translation: zhHans },
    "zh-Hant": { translation: zhHant },
  },
  lng: initialLocale,
  fallbackLng: "en",
  supportedLngs: ["en", "zh-Hans", "zh-Hant"],
  interpolation: { escapeValue: false }, // React escapes
  returnNull: false,
  initImmediate: false,
});
```

Preference storage: `souzi-locale` with values `system | en | zh-Hans | zh-Hant`.

Detection:

- Read the stored preference.
- `system`: walk `navigator.languages`; map `zh-TW`, `zh-HK`, `zh-MO`, and `*-Hant` to `zh-Hant`; other `zh-*` to `zh-Hans`; `en-*` to `en`; fallback `en`.
- Re-resolve on `languagechange` and on `visibilitychange` when the preference is `system` (Android `configChanges` includes `locale`, so the activity is not recreated).

On change:

- `await i18n.changeLanguage(locale)`.
- `document.documentElement.lang = locale`, `document.documentElement.dir = i18n.dir(locale)`.
- Update `document.title`.
- Announce the change through a polite live region.

### Catalogs

Flat keys grouped by prefix, or nested JSON. Use the same shape in all locales.

```json
{
  "nav.search": "Search",
  "nav.saved": "Saved",
  "nav.settings": "Settings",
  "search.resultCount_one": "{{count}} word",
  "search.resultCount_other": "{{count}} words",
  "entry.alsoWritten": "Also written {{traditional}}",
  "entry.listenTo": "Listen to {{word}}"
}
```

Rules:

- Chinese plural entries only need `_other`; i18next handles that.
- Keep placeholders identical across locales; a test enforces this.
- Use `<Trans>` for the few sentences with embedded links/markup (About credits, install notice, “Also written” with a `lang` span).
- Add contextual comments in the English catalog for ambiguous labels (status pills, buttons, headings).

### Async errors and worker messages

This is the most important refactor for correct localisation.

Today, `lib/*`, hooks, and the import worker store English strings in state:

- `useNativeCedictDownload`, `useFullEnglishDownload`, `useExamplePack`, `useRelatedPack` expose `error: string`.
- `src/workers/import.worker.ts` sends `ImportProgress.message` and English error strings.
- `example-pack.ts`, `related-pack.ts`, `english-core.ts`, `full-english.ts`, `cedict-import.ts`, `speech-native.ts`, and the Android plugins all produce English messages.

Replace with:

```ts
export type ErrorCode =
  | "errors.network"
  | "errors.packManifest"
  | "errors.packChecksum"
  | "errors.importNotCedict"
  | "errors.downloadStart"
  | "errors.downloadStatus"
  | "errors.downloadIncomplete"
  | "errors.speechUnavailable"
  | "errors.dictionaryNotFound";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly params?: Record<string, string | number>,
  ) {
    super(code);
  }
}
```

- Hooks store `AppError | null`; UI renders `t(error.code, error.params)`.
- Worker progress becomes `{ phase, current, total }`; the UI composes “Parsing 12,345 / 47,000 lines…” with `t()` and `formatCount()`.
- Worker errors post `{ code, params }`.
- Android plugins reject with a stable `code` (Capacitor `call.reject(message, code)`); `speech-native.ts` and download hooks map that to `AppError`. Raw English stays in logs.
- Remove `ImportProgress.message` and the duplicated `phaseLabel` copy where the key can be shared.

Toasts can translate at call time (`showToast(t("..."))`) because they are short-lived. Persistent errors must be codes.

### Formatting

`src/lib/format.ts` currently uses the browser default locale and hardcoded units.

- `formatCount(count, locale?)` → `Intl.NumberFormat(locale)`.
- `formatDate(iso, locale?)` → `Intl.DateTimeFormat(locale, ...)`.
- `formatBytes(bytes, locale?)` → locale number + translated unit from the catalog (`units.mb`, etc.).
- Replace `toLocaleString()` calls in `DownloadsView` and `import.worker.ts`.
- Components re-render on language change, so optional `locale = i18n.resolvedLanguage` defaults are safe.

### Routing and document metadata

- Map routes to title keys: `pageTitles.search`, `saved`, `settings`, `downloads`, `about`, `install`, `import`.
- Entry pages set the title after the entry loads: `${entry.simp} — ${t("app.name")}` / `${entry.word} — ${t("app.name")}`.
- Add a shared `useDocumentTitle()` hook.
- On route change: focus the page `h1` (or `main`) and update the title. Do not focus on initial load.
- Skip link must be a `<button>` that focuses `main`, not `href="#main"` — a hash link would be parsed by the existing router as a route change.

### Styling for Chinese

- Add CJK fallbacks to `--font-ui`: `"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC"`.
- Add `"Noto Serif CJK SC", "Source Han Serif SC"` to `--font-han`.
- Under `:lang(zh)`, disable `text-transform: uppercase` and reduce letter spacing on kickers/labels.
- Keep full-width Chinese punctuation in the catalog; do not mix ASCII commas/periods in Chinese sentences.
- Check line wrapping at 320px; Chinese has no spaces, so `overflow-wrap: break-word` matters.

## 4. Accessibility workstream

### Must fix (WCAG AA / blocking)

1. **Accessible names**
   - Brand: make the logo decorative inside the button, remove `aria-label`, add visually hidden “Home”.
   - Result cards: remove the overriding `aria-label` so the word, pinyin, and gloss form the name. If a label is needed, include the visible content.
   - Saved toggle: make the name include the visible “Saved” state, e.g. “Saved — remove from saved words”, and add `aria-pressed`.

2. **Language metadata**
   - `<html lang>` follows the UI locale.
   - Tag content by language: `lang="zh-Hans"` / `zh-Hant` for Han text, `lang="zh-Latn"` for pinyin, `lang="en"` for English definitions/examples.
   - Cover entry pages, result cards, history, saved lists, examples, related words, forms, classifiers, and the Setup brand `搜字`.

3. **Search live region**
   - Remove `aria-live` from the results `<section>`.
   - Add one visually hidden `role="status"` / `aria-live="polite"` / `aria-atomic="true"` element that contains only “3 results for X”, “No results for X”, or empty while searching.
   - Keep `aria-busy` on the results section.

4. **Focus management**
   - On navigation, move focus to the page `h1` (add `tabIndex={-1}`) or `main`.
   - Restore scroll without smooth animation on route change.
   - Return focus to the trigger after dialogs close.

5. **Headings and landmarks**
   - Add an `h1` to Search (visually hidden is fine).
   - Result groups: `h2` with a labelled `<section>`.
   - Entry panels: `h2` for Meaning, Chinese meaning, More in English, Forms, Examples, Related words.
   - Saved empty state `h3` → `h2`; group headers → `h2`.
   - About: add an `h2` before the how-cards (keep cards `h3`).
   - Setup: one `h1`, then `h2` per dictionary; wrap in `<main>`.
   - Give the two navs distinct labels (`Primary` / `Mobile`) and add `aria-current="page"` to the active tab.

6. **Modal**
   - Replace the custom modal with native `<dialog>` + `showModal()` or a small focus-trap hook.
   - Initial focus on the dialog heading or primary action; Escape closes; focus restores to the trigger; background inert.
   - Add `aria-describedby` for the warning text.

7. **Contrast tokens (light theme)**
   - `--muted: #5c6862` (5.24:1 on bg, 4.93:1 on surface-2, 4.67:1 on vermilion-soft).
   - `--gold: #8a6224` (5.36:1 on surface, 4.57:1 on gold-soft).
   - `--vermilion: #a4422e` (6.08:1 on surface, 4.95:1 on soft).
   - Remove the 82% opacity from fine print/progress notes (use full `--muted`).
   - Make sticky header/bottom nav backgrounds effectively opaque (≥95%) or provide a solid fallback.
   - Dark theme already passes; verify after changes.

8. **Focus indicator**
   - Use a solid `2px` `var(--jade)` outline with `2px` offset for all controls.
   - Remove `outline: none` from `.search-input:focus`; keep a visible ring.
   - Check that the ring is visible against `--surface`, `--bg`, and `--jade-soft`.

9. **Progress and status**
   - Every `role="progressbar"` needs an accessible name and `aria-valuetext` (e.g. “45% — downloading dictionary”).
   - Add the missing `aria-valuenow` in SetupView; omit it for indeterminate states and set `aria-valuetext="Preparing"`.
   - Remove `role="status"` from the download banner container; announce only the status phrase, throttled (e.g. every 10% or on phase change).

10. **File inputs**
    - Use `hidden` (or `display:none`) instead of `.sr-only` for the file inputs; the visible “Choose file” button remains the accessible control.
    - Add an `aria-live` error region to SetupView; ImportView already uses `role="alert"`.

11. **Type and target sizes**
    - Raise badges from 0.5625rem to at least 0.75rem; raise kickers/fine print to 0.75rem.
    - Review `.text-link` (currently ~19px high) against the 24×24 target; add padding or min-height.
    - Keep the existing large primary controls.

### Follow-up / polish

- Toast: `role="status"` for success, `role="alert"` for errors; do not auto-dismiss errors after 3.2s or add a dismiss button.
- Header/bottom nav: avoid translucent backgrounds; test contrast over scrolling content.
- Keyboard-open bottom nav: consider `inert` while hidden so TalkBack cannot reach invisible links.
- `prefers-reduced-motion`: already handled; also avoid smooth scroll when changing routes.
- `forced-colors`: add borders for cards/buttons and ensure focus uses `currentColor`.
- `<noscript>`: bilingual message.
- Android font scaling: verify system font size changes the WebView. Capacitor does not call `setTextZoom`; if it does not scale, apply `Configuration.fontScale` to `WebSettings.setTextZoom` in `MainActivity` and handle `onConfigurationChanged` (add `fontScale` to `configChanges`).
- Android 13+ per-app language: optional `localeConfig` + `values-zh-rCN`; test whether `navigator.languages` follows it. Do not add until tested.

## 5. Phased delivery

### Phase 0 — Decisions and glossary (0.5 day)

- Confirm locales (recommended `en`, `zh-Hans`; `zh-Hant` phase 2).
- Agree on the custom-vs-i18next decision.
- Write `docs/i18n-glossary.md` with the term table below.
- Decide whether localized SEO pages are in scope (recommended: no; UI localization only).

### Phase 1 — Accessibility foundation (1–2 days)

Independent of i18n and safe to ship first:

- Brand/result-card names, live region, focus management, headings/landmarks, `aria-current`.
- Modal focus trap, file inputs, progress semantics.
- Contrast tokens, focus ring, type sizes, sticky surface opacity.
- Add the skip-link button and `main` focus target.
- Re-run Lighthouse and manual keyboard/screen-reader checks.

### Phase 2 — i18n foundation + vertical slice (2–3 days)

- Add dependencies and `src/i18n/`.
- Add locale preference, detection, `<html lang>`, `dir`, `document.title`.
- Add the language selector to Settings and the Setup header.
- Migrate `App`, `SearchPage`, `SettingsView`, `SavedView` (the most-used path).
- Add catalog-parity/plural/locale tests.
- Keep the Chinese catalog behind full coverage; untranslated keys fall back to English during development.

### Phase 3 — Remaining UI and async text (3–4 days)

- Migrate `EntryView`, `EnglishEntryView`, `DownloadsView`, `SetupView`, `ImportView`, `InstallView`, `AboutView`, `ChineseDownloadBanner`, `Toast`, result cards.
- Refactor hooks/libs/worker/Android plugins to error codes and structured progress.
- Add language-of-parts tags across dictionary content.
- Move attribution strings out of `example-sentences.ts` into the UI.
- Replace locale-dependent formatting in `format.ts` and `DownloadsView`.

### Phase 4 — Translation and review (2 days)

- Translate `zh-Hans` (and `zh-Hant` if in scope).
- Review in context at 390×844 and desktop: truncation, word order, terminology, punctuation.
- Native-speaker review; no unreviewed machine translation for a dictionary app.
- Verify statuses, errors, aria-labels, titles, and setup copy.

### Phase 5 — QA, tests, docs (1–2 days)

- Add `scripts/check-i18n.mjs` + `pnpm i18n:check` (parity, placeholders, plural categories, unused keys).
- Run it in the deploy workflow before `pnpm build`.
- Add `docs/i18n.md` (how to add a language) and `docs/accessibility.md` (QA checklist).
- Update README with supported UI languages and the difference between UI language and dictionary content.
- Manual device pass: Android/TalkBack, desktop NVDA, keyboard-only, 200%/400% zoom, high contrast, reduced motion.

Total estimate for `en` + `zh-Hans`: **9–13 working days**. Add **2–3 days** for `zh-Hant`.

### Suggested PR split

1. `fix(a11y): landmarks, names, focus, live regions, contrast`
2. `feat(i18n): add i18next, locale preference, shell/search/settings`
3. `refactor(errors): return structured error codes and progress`
4. `feat(i18n): localize entries, packs, setup, import, about`
5. `feat(i18n): add Simplified Chinese catalog`
6. `test(i18n): catalog checks and formatters`
7. `feat(i18n): add Traditional Chinese catalog` (optional)

## 6. Acceptance criteria

Localisation:

- UI switches instantly without reload; preference persists; “System” follows the device.
- `<html lang>` and `dir` match the resolved locale; document titles reflect route and locale.
- No translated strings are stored in component state, hooks, workers, IndexedDB, or native bridge payloads.
- `pnpm i18n:check` passes: same key set (ignoring plural suffixes), matching placeholders, required plural categories.
- `pnpm test` and `pnpm build` pass.
- No raw UI strings remain outside the catalogs (allowlist for brand/proper nouns).
- Chinese and English text is tagged correctly; TTS picks the right voice for dictionary content.

Accessibility:

- Lighthouse accessibility 100 with zero `label-content-name-mismatch`; axe manual run on Search, Entry, Settings, Packs, Import, About, Setup.
- Keyboard-only: search → result → save → back → settings → language switch, with visible focus at every step.
- Route change moves focus to the page heading and announces the new page once.
- Screen reader: search result count announced once, not the whole list; errors are announced; dialog traps focus and restores it.
- 200% text zoom and 320px width: no clipped text or horizontal scrolling; 400% zoom usable for key flows.
- Light/dark contrast: normal text ≥4.5:1, large text ≥3:1, focus indicator ≥3:1; checked manually because `color-mix()` and translucency are not reliably audited.
- Reduced motion: no animations/smooth scroll; high-contrast/forced-colors remains usable.

## 7. Translation glossary (Simplified Chinese)

| English | Chinese | Notes |
| --- | --- | --- |
| Search | 搜索 | Tab label |
| Saved | 收藏 | Tab label |
| Saved words | 收藏的词语 | Page title |
| Settings | 设置 | |
| Packs | 词库与扩展 | Page title; not “包” |
| Dictionary | 词典 | |
| Full English dictionary | 完整英语词典 | |
| Chinese dictionary | 中文词典 | |
| Entry | 词条 | |
| Meaning / definition | 释义 | |
| Chinese meaning | 中文释义 | |
| More in English | 英文解释 | |
| Examples | 例句 | |
| Forms | 词形变化 | |
| Related words | 相关词 | |
| Synonyms | 近义词 | |
| Antonyms | 反义词 | |
| Counting word | 量词 | |
| Each character | 逐字解释 | Section kicker |
| Character meanings | 单字释义 | |
| Listen | 朗读 | |
| Save | 收藏 | Verb |
| Saved | 已收藏 | State |
| Copy | 复制 | |
| Back | 返回 | |
| Continue | 继续 | |
| Remove | 移除 | |
| Download | 下载 | |
| Install | 安装 | |
| Update | 更新 | |
| Ready | 已就绪 | Status pill |
| Optional | 可选 | Status pill |
| Paused | 已暂停 | |
| Preparing | 准备中… | |
| Not added | 未添加 | |
| Wi-Fi only | 仅限 Wi-Fi | Keep “Wi-Fi” |
| Works offline | 离线可用 | |
| On this device | 本设备上 | |
| Recent words | 最近查词 | |
| Try | 试试 | Search hint |
| No word found | 未找到词语 | |

Style rules:

- Use “你”, not “您”; keep sentences short.
- Full-width punctuation in Chinese sentences.
- Keep the app name as “Souzi 搜字”.
- Do not translate license names, URLs, or data-source names.
- Status labels use “已…” where natural (已暂停/已就绪/已收藏).

## 8. Decisions needed

1. Locales: `en` + `zh-Hans` first, or `en` + `zh-Hans` + `zh-Hant` together?
2. Library: i18next (recommended) or a zero-dependency typed catalog?
3. Should localized SEO/static pages (`/zh/`, `hreflang`) be part of this work, or is client-side UI language enough?
4. Is a native-speaker review available for the Chinese catalog?
