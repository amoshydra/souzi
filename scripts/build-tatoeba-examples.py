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
    eng_path: Path,
    cmn_path: Path,
    core_path: Path,
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
    parser.add_argument("--eng", required=True, type=Path)
    parser.add_argument("--cmn", required=True, type=Path)
    parser.add_argument("--core", default=Path("public/data/ecdict-core.json.gz"), type=Path)
    parser.add_argument("--output-dir", default=Path("build/examples"), type=Path)
    parser.add_argument("--version", default=1, type=int)
    parser.add_argument(
        "--base-url",
        default="https://github.com/amoshydra/souzi/releases/download/examples-v1",
    )
    args = parser.parse_args()
    build(
        args.links.resolve(),
        args.eng.resolve(),
        args.cmn.resolve(),
        args.core.resolve(),
        args.output_dir.resolve(),
        args.version,
        args.base_url,
    )


if __name__ == "__main__":
    main()
