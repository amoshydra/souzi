#!/usr/bin/env python3
"""Build an English related-words pack from Princeton WordNet 3.1.

Usage:
    python3 scripts/build-wordnet-related.py \
        --dict /path/to/wordnet/dict \
        --core public/data/ecdict-core.json.gz \
        --output-dir build/related \
        --version 1 \
        --base-url https://raw.githubusercontent.com/amoshydra/souzi/dict-manifest/related/v1
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import time
from pathlib import Path

MAX_PER_GROUP = 8
WHITESPACE_RE = re.compile(r"\s+")
WORD_RE = re.compile(r"[a-z][a-z' -]*$")


def normalize_word(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value.strip().lower().replace("_", " ").replace("’", "'"))


def open_text(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("rt", encoding="utf-8")


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


def load_synsets(dict_dir: Path) -> dict[int, dict]:
    synsets: dict[int, dict] = {}
    for name in ("data.noun", "data.verb", "data.adj", "data.adv"):
        path = dict_dir / name
        if not path.exists():
            continue
        with path.open("rt", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                if line.startswith("  ") or not line.strip():
                    continue
                left, _, _gloss = line.partition("|")
                parts = left.split()
                if len(parts) < 6:
                    continue
                try:
                    offset = int(parts[0])
                except ValueError:
                    continue
                ss_type = parts[2]
                try:
                    w_cnt = int(parts[3], 16) if ss_type == "s" else int(parts[3])
                except ValueError:
                    continue
                words = []
                index = 4
                for _ in range(w_cnt):
                    if index + 1 >= len(parts):
                        break
                    words.append(normalize_word(parts[index]))
                    index += 2
                if index >= len(parts):
                    continue
                try:
                    p_cnt = int(parts[index])
                except ValueError:
                    continue
                index += 1
                pointers = []
                for _ in range(p_cnt):
                    if index + 3 >= len(parts):
                        break
                    pointers.append((parts[index], parts[index + 1], parts[index + 3]))
                    index += 4
                synsets[offset] = {"words": words, "pointers": pointers}
    return synsets


def load_exceptions(dict_dir: Path) -> dict[str, str]:
    forms: dict[str, str] = {}
    for name in ("noun.exc", "verb.exc", "adj.exc", "adv.exc"):
        path = dict_dir / name
        if not path.exists():
            continue
        with path.open("rt", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                parts = line.split()
                if len(parts) < 2:
                    continue
                base = normalize_word(parts[0])
                for raw in parts[1:]:
                    form = normalize_word(raw)
                    if form and form != base:
                        forms.setdefault(form, base)
    return forms


def load_senses(dict_dir: Path) -> dict[str, list[tuple[str, int, int, int]]]:
    senses: dict[str, list[tuple[str, int, int, int]]] = {}
    path = dict_dir / "index.sense"
    if not path.exists():
        return senses

    with path.open("rt", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            parts = line.split()
            if len(parts) < 4:
                continue
            key = parts[0]
            lemma, separator, rest = key.partition("%")
            if not separator:
                continue
            pos = rest.split(":", 1)[0]
            try:
                offset = int(parts[1])
                sense_number = int(parts[2])
                tag_count = int(parts[3])
            except ValueError:
                continue
            word = normalize_word(lemma)
            if word:
                senses.setdefault(word, []).append(
                    (pos, offset, sense_number, tag_count)
                )
    return senses


def add_values(target: list[str], values: list[str], limit: int = MAX_PER_GROUP) -> None:
    for value in values:
        if value not in target:
            target.append(value)
        if len(target) >= limit:
            return


def build(
    dict_dir: Path,
    core_path: Path,
    output_dir: Path,
    version: int,
    base_url: str,
) -> None:
    started = time.time()
    core_words, form_to_base = load_core(core_path)
    exceptions = load_exceptions(dict_dir)
    form_to_base.update(exceptions)
    print(f"core words: {len(core_words):,}; forms: {len(form_to_base):,}", flush=True)

    synsets = load_synsets(dict_dir)
    senses = load_senses(dict_dir)
    print(f"synsets: {len(synsets):,}; senses: {sum(len(v) for v in senses.values()):,}", flush=True)

    relations: dict[str, dict[str, list[str]]] = {}

    def bucket(base: str) -> dict[str, list[str]]:
        return relations.setdefault(base, {"synonyms": [], "antonyms": [], "related": []})

    def ordered_senses(items: list[tuple[str, int, int, int]]) -> list[int]:
        # Use the most common sense first. Mixing senses produces noisy
        # "synonyms" such as fast (quick) and fast (abstain from food).
        return [
            item[1]
            for item in sorted(items, key=lambda item: (-item[3], item[2]))
        ]

    for base in sorted(core_words):
        own = bucket(base)
        for offset in ordered_senses(senses.get(base, [])):
            synset = synsets.get(offset)
            if not synset:
                continue
            synonyms = [word for word in synset["words"] if word and word != base]
            antonyms: list[str] = []
            related: list[str] = []
            for symbol, target, _pos in synset["pointers"]:
                target_synset = synsets.get(int(target)) if target.isdigit() else None
                if not target_synset:
                    continue
                target_words = target_synset["words"]
                if symbol == "!":
                    antonyms.extend(target_words)
                elif symbol in ("@", "&", "*"):
                    related.extend(target_words)
            add_values(own["synonyms"], synonyms)
            add_values(own["antonyms"], [word for word in antonyms if word != base])
            add_values(
                own["related"],
                [
                    word
                    for word in related
                    if word != base and word not in own["synonyms"] and word not in own["antonyms"]
                ],
            )
            if any(own.values()):
                break

    # Remove empty groups and trim to words with at least one relation.
    cleaned: dict[str, dict[str, list[str]]] = {}
    for word, groups in sorted(relations.items()):
        filtered = {name: values for name, values in groups.items() if values}
        if filtered:
            cleaned[word] = filtered

    print(f"words with relations: {len(cleaned):,}", flush=True)

    output_dir.mkdir(parents=True, exist_ok=True)
    pack_name = f"souzi-related-v{version}.json.gz"
    pack_path = output_dir / pack_name

    payload = {
        "version": version,
        "source": "Princeton WordNet 3.1",
        "sourceUrl": "https://wordnet.princeton.edu",
        "license": "WordNet License",
        "entries": sum(
            len(values)
            for groups in cleaned.values()
            for values in groups.values()
        ),
        "relations": cleaned,
    }
    with pack_path.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=9, mtime=0) as archive:
            archive.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))

    digest = hashlib.sha256(pack_path.read_bytes()).hexdigest()
    manifest = {
        "id": "related-en",
        "name": "Related Words",
        "version": version,
        "schema": 1,
        "entries": payload["entries"],
        "words": len(cleaned),
        "file": pack_name,
        "url": f"{base_url.rstrip('/')}/{pack_name}",
        "bytes": pack_path.stat().st_size,
        "sha256": digest,
        "license": "WordNet License",
        "source": "Princeton WordNet 3.1",
        "sourceUrl": "https://wordnet.princeton.edu",
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
    parser.add_argument("--dict", required=True, type=Path)
    parser.add_argument("--core", default=Path("public/data/ecdict-core.json.gz"), type=Path)
    parser.add_argument("--output-dir", default=Path("build/related"), type=Path)
    parser.add_argument("--version", default=1, type=int)
    parser.add_argument(
        "--base-url",
        default="https://raw.githubusercontent.com/amoshydra/souzi/dict-manifest/related/v1",
    )
    args = parser.parse_args()
    build(
        args.dict.resolve(),
        args.core.resolve(),
        args.output_dir.resolve(),
        args.version,
        args.base_url,
    )


if __name__ == "__main__":
    main()
