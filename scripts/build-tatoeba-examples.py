#!/usr/bin/env python3
"""Build an English–Chinese example-sentence pack from Tatoeba.

Usage:
    python3 scripts/build-tatoeba-examples.py \
        --links /path/to/eng-cmn_links.tsv.bz2 \
        --eng /path/to/eng_sentences.tsv.bz2 \
        --cmn /path/to/cmn_sentences.tsv.bz2 \
        --core public/data/ecdict-core.json.gz \
        --output-dir build/examples \
        --version 1 \
        --base-url https://github.com/amoshydra/souzi/releases/download/examples-v1
"""

from __future__ import annotations

import argparse
import bz2
import gzip
import hashlib
import json
import re
import time
from pathlib import Path

WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’-]*")
WHITESPACE_RE = re.compile(r"\s+")
CJK_RE = re.compile(r"[\u3400-\u9fff]")
LATIN_RE = re.compile(r"[A-Za-z]")
HAN_WORD_RE = re.compile(r"^[\u3400-\u9fff]{1,4}$")
MAX_EXAMPLES = 3

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an",
    "and", "any", "are", "as", "at", "be", "because", "been", "before",
    "being", "below", "between", "both", "but", "by", "can", "could", "did",
    "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers",
    "herself", "him", "himself", "his", "how", "i", "if", "in", "into",
    "is", "it", "its", "itself", "just", "me", "more", "most", "my",
    "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over",
    "own", "same", "she", "should", "so", "some", "such", "than", "that",
    "the", "their", "theirs", "them", "themselves", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "we", "were", "what", "when", "where",
    "which", "while", "who", "whom", "why", "will", "with", "would",
    "you", "your", "yours", "yourself", "yourselves",
}


def normalize_word(value: str) -> str:
    return value.strip().lower().replace("’", "'").replace("‘", "'")


def open_text(path: Path):
    if path.suffix == ".bz2":
        return bz2.open(path, "rt", encoding="utf-8")
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("rt", encoding="utf-8")


def load_sentences(path: Path) -> dict[int, str]:
    sentences: dict[int, str] = {}
    with open_text(path) as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 2)
            if len(parts) != 3:
                continue
            try:
                sentence_id = int(parts[0])
            except ValueError:
                continue
            sentences[sentence_id] = parts[2].strip()
    return sentences


def load_links(path: Path) -> list[tuple[int, int]]:
    links: list[tuple[int, int]] = []
    with open_text(path) as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t")
            if len(parts) != 2:
                continue
            try:
                links.append((int(parts[0]), int(parts[1])))
            except ValueError:
                continue
    return links


def load_core(path: Path) -> tuple[set[str], dict[str, str]]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)

    words: set[str] = set()
    form_to_base: dict[str, str] = {}
    for entry in payload.get("entries", []):
        word = normalize_word(entry.get("word", ""))
        if not word:
            continue
        words.add(word)
        exchange = entry.get("exchange", "")
        for part in exchange.split("/"):
            _, separator, value = part.partition(":")
            if not separator:
                continue
            for raw in value.split():
                form = normalize_word(raw)
                if form and form != word:
                    form_to_base.setdefault(form, word)
    return words, form_to_base


def load_opencc(chars_path: Path | None, phrases_path: Path | None):
    chars: dict[str, str] = {}
    if chars_path and chars_path.exists():
        with chars_path.open("rt", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                source, _, values = line.partition("\t")
                if source and values:
                    chars[source] = values.split()[0]

    phrase_by_first: dict[str, list[tuple[str, str]]] = {}
    if phrases_path and phrases_path.exists():
        with phrases_path.open("rt", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                source, _, values = line.partition("\t")
                if not source or not values:
                    continue
                target = values.split()[0]
                phrase_by_first.setdefault(source[0], []).append((source, target))
        for items in phrase_by_first.values():
            items.sort(key=lambda item: len(item[0]), reverse=True)

    def convert(text: str) -> str:
        out: list[str] = []
        index = 0
        while index < len(text):
            replaced = False
            for source, target in phrase_by_first.get(text[index], []):
                if text.startswith(source, index):
                    out.append(target)
                    index += len(source)
                    replaced = True
                    break
            if replaced:
                continue
            char = text[index]
            out.append(chars.get(char, char))
            index += 1
        return "".join(out)

    return convert


def load_zh_vocabulary(
    path: Path,
    convert,
    frequency_path: Path | None,
    frequency_limit: int,
) -> set[str]:
    with path.open("rt", encoding="utf-8") as handle:
        data = json.load(handle)
    words: set[str] = set()
    for raw in data:
        word = convert(str(raw).strip())
        if HAN_WORD_RE.fullmatch(word):
            words.add(word)

    if frequency_path and frequency_path.exists() and frequency_limit > 0:
        with frequency_path.open("rt", encoding="utf-8") as handle:
            frequency = json.load(handle)
        for raw in list(frequency)[:frequency_limit]:
            word = convert(str(raw).strip())
            if HAN_WORD_RE.fullmatch(word):
                words.add(word)

    return words


def chinese_matches(text: str, vocabulary: set[str]) -> set[str]:
    matches: set[str] = set()
    index = 0
    while index < len(text):
        for size in range(min(4, len(text) - index), 0, -1):
            candidate = text[index : index + size]
            if candidate in vocabulary:
                matches.add(candidate)
                index += size
                break
        else:
            index += 1
    return matches


def sentence_tokens(text: str) -> list[str]:
    return [normalize_word(match.group(0)) for match in WORD_RE.finditer(text)]


def add_candidate(
    examples: dict[str, list[dict[str, str]]],
    word: str,
    text: str,
    translation: str,
    seen: dict[str, set[str]],
) -> None:
    if word in seen and text in seen[word]:
        return
    bucket = examples.setdefault(word, [])
    if len(bucket) >= MAX_EXAMPLES:
        return
    bucket.append(
        {
            "text": text,
            "translation": translation,
            "source": "Tatoeba",
        }
    )
    seen.setdefault(word, set()).add(text)


def build(
    links_path: Path,
    zh_links_path: Path | None,
    eng_path: Path,
    cmn_path: Path,
    core_path: Path,
    hsk_path: Path,
    frequency_path: Path | None,
    frequency_limit: int,
    t2s_chars: Path | None,
    t2s_phrases: Path | None,
    min_zh_words: int,
    output_dir: Path,
    version: int,
    base_url: str,
) -> None:
    started = time.time()
    print("loading sentences…", flush=True)
    english = load_sentences(eng_path)
    chinese = load_sentences(cmn_path)
    print(f"english: {len(english):,}; chinese: {len(chinese):,}", flush=True)

    print("loading core vocabulary…", flush=True)
    core_words, form_to_base = load_core(core_path)
    print(f"core words: {len(core_words):,}; forms: {len(form_to_base):,}", flush=True)

    print("loading links…", flush=True)
    links = load_links(links_path)
    print(f"links: {len(links):,}", flush=True)

    examples: dict[str, list[dict[str, str]]] = {}
    seen: dict[str, set[str]] = {}
    usable = 0

    for eng_id, cmn_id in links:
        text = english.get(eng_id, "")
        translation = chinese.get(cmn_id, "")
        if not text or not translation or not CJK_RE.search(translation):
            continue

        words = text.split()
        if not (3 <= len(words) <= 16):
            continue
        if not (8 <= len(text) <= 120) or len(translation) > 48:
            continue

        tokens = sentence_tokens(text)
        if len(tokens) < 2:
            continue

        matched: set[str] = set()
        for token in tokens:
            if token in core_words and token not in STOPWORDS:
                matched.add(token)
            base = form_to_base.get(token)
            if base and base not in STOPWORDS:
                matched.add(base)

        # Include common two- and three-word phrases that exist in the core.
        for size in (2, 3):
            for index in range(0, len(tokens) - size + 1):
                phrase = " ".join(tokens[index : index + size])
                if phrase in core_words:
                    matched.add(phrase)

        if not matched:
            continue

        for word in matched:
            add_candidate(examples, word, text, translation, seen)
        usable += 1

    print(f"usable pairs: {usable:,}; words with examples: {len(examples):,}", flush=True)

    chinese_words = 0
    if zh_links_path:
        print("loading OpenCC data…", flush=True)
        convert = load_opencc(t2s_chars, t2s_phrases)
        print("loading HSK vocabulary…", flush=True)
        hsk_words = load_zh_vocabulary(
            hsk_path, convert, frequency_path, frequency_limit
        )
        print(f"chinese vocabulary: {len(hsk_words):,}", flush=True)

        print("loading Chinese links…", flush=True)
        zh_links = load_links(zh_links_path)
        print(f"chinese links: {len(zh_links):,}", flush=True)

        zh_candidates: dict[str, list[tuple[tuple[int, int, int], str, str]]] = {}
        zh_usable = 0

        for cmn_id, eng_id in zh_links:
            original = chinese.get(cmn_id, "")
            translation = english.get(eng_id, "")
            if not original or not translation:
                continue
            if LATIN_RE.search(original) or CJK_RE.search(translation):
                continue
            if not (4 <= len(original) <= 26) or not (8 <= len(translation) <= 110):
                continue
            if "..." in original or "…" in original:
                continue

            simplified = convert(original)
            if LATIN_RE.search(simplified) or not CJK_RE.search(simplified):
                continue

            matched = chinese_matches(simplified, hsk_words)
            if not matched:
                continue

            score = (
                1 if original != simplified else 0,
                abs(len(simplified) - 11),
                len(translation),
            )
            for word in matched:
                zh_candidates.setdefault(word, []).append(
                    (score, simplified, translation)
                )
            zh_usable += 1

        for word, candidates in sorted(zh_candidates.items()):
            candidates.sort(key=lambda item: item[0])
            seen_texts: set[str] = set()
            for _, text, translation in candidates:
                normalized = WHITESPACE_RE.sub("", text)
                if normalized in seen_texts:
                    continue
                seen_texts.add(normalized)
                add_candidate(examples, word, text, translation, seen)
                if len(seen_texts) >= MAX_EXAMPLES:
                    break
            if examples.get(word):
                chinese_words += 1

        print(
            f"chinese pairs: {zh_usable:,}; chinese words: {chinese_words:,}",
            flush=True,
        )
        if min_zh_words and chinese_words < min_zh_words:
            raise SystemExit(
                f"Chinese coverage too low: {chinese_words:,} words "
                f"(minimum {min_zh_words:,})"
            )

    output_dir.mkdir(parents=True, exist_ok=True)
    pack_name = f"souzi-examples-v{version}.json.gz"
    pack_path = output_dir / pack_name

    ordered = {word: examples[word] for word in sorted(examples)}
    payload = {
        "version": version,
        "source": "Tatoeba",
        "sourceUrl": "https://tatoeba.org",
        "license": "CC BY 2.0 FR",
        "entries": sum(len(items) for items in ordered.values()),
        "examples": ordered,
    }
    with pack_path.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=9, mtime=0) as archive:
            archive.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))

    digest = hashlib.sha256(pack_path.read_bytes()).hexdigest()
    manifest = {
        "id": "examples-en-zh",
        "name": "Example Sentences",
        "version": version,
        "schema": 1,
        "entries": payload["entries"],
        "words": len(ordered),
        "chineseWords": chinese_words,
        "file": pack_name,
        "url": f"{base_url.rstrip('/')}/{pack_name}",
        "bytes": pack_path.stat().st_size,
        "sha256": digest,
        "license": "CC BY 2.0 FR",
        "source": "Tatoeba",
        "sourceUrl": "https://tatoeba.org",
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"pack: {pack_path} ({pack_path.stat().st_size / 1024 / 1024:.1f} MB)", flush=True)
    print(f"sha256: {digest}", flush=True)
    print(f"elapsed: {time.time() - started:.1f}s", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--links", required=True, type=Path)
    parser.add_argument("--zh-links", type=Path)
    parser.add_argument("--eng", required=True, type=Path)
    parser.add_argument("--cmn", required=True, type=Path)
    parser.add_argument("--core", default=Path("public/data/ecdict-core.json.gz"), type=Path)
    parser.add_argument("--hsk", default=Path("src/data/hsk30.json"), type=Path)
    parser.add_argument("--frequency", default=Path("src/data/frequency.json"), type=Path)
    parser.add_argument("--frequency-limit", default=10000, type=int)
    parser.add_argument("--t2s-chars", type=Path)
    parser.add_argument("--t2s-phrases", type=Path)
    parser.add_argument("--min-zh-words", default=0, type=int)
    parser.add_argument("--output-dir", default=Path("build/examples"), type=Path)
    parser.add_argument("--version", default=1, type=int)
    parser.add_argument(
        "--base-url",
        default="https://github.com/amoshydra/souzi/releases/download/examples-v1",
    )
    args = parser.parse_args()
    build(
        args.links.resolve(),
        args.zh_links.resolve() if args.zh_links else None,
        args.eng.resolve(),
        args.cmn.resolve(),
        args.core.resolve(),
        args.hsk.resolve(),
        args.frequency.resolve() if args.frequency else None,
        args.frequency_limit,
        args.t2s_chars.resolve() if args.t2s_chars else None,
        args.t2s_phrases.resolve() if args.t2s_phrases else None,
        args.min_zh_words,
        args.output_dir.resolve(),
        args.version,
        args.base_url,
    )


if __name__ == "__main__":
    main()
