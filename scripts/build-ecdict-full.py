#!/usr/bin/env python3
"""Build the optional full ECDICT SQLite database and its manifest.

The source is ECDICT (MIT licensed). The output database is intentionally
read-only at runtime and contains only the fields Souzi displays.

Usage:
    python3 scripts/build-ecdict-full.py \
        --input /path/to/ecdict.csv \
        --output-dir build/ecdict \
        --version 1 \
        --base-url https://amoshydra.github.io/souzi/ecdict
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import os
import re
import sqlite3
import time
from pathlib import Path

WORD_RE = re.compile(r"^[a-z][a-z' .-]*$")
VOWEL_RE = re.compile(r"[aeiouy]")
WHITESPACE_RE = re.compile(r"\s+")

SCHEMA_VERSION = 1
ECDICT_SOURCE = "https://github.com/skywind3000/ECDICT"


def normalize(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value.strip().lower().replace("’", "'").replace("‘", "'"))


def integer(value: str | None) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def exchange_forms(exchange: str | None) -> set[str]:
    forms: set[str] = set()
    for part in (exchange or "").split("/"):
        _, separator, value = part.partition(":")
        if not separator:
            continue
        for raw in value.split():
            form = normalize(raw)
            if len(form) > 1 and WORD_RE.fullmatch(form) and VOWEL_RE.search(form):
                forms.add(form)
    return forms


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build(input_path: Path, output_dir: Path, version: int, base_url: str, mirror_url: str, source_commit: str, pack_url: str | None) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    version_dir = output_dir / f"v{version}"
    version_dir.mkdir(parents=True, exist_ok=True)
    db_path = version_dir / f"ecdict-full-v{version}.sqlite"
    gz_path = version_dir / f"ecdict-full-v{version}.sqlite.gz"

    if db_path.exists():
        db_path.unlink()
    if gz_path.exists():
        gz_path.unlink()

    connection = sqlite3.connect(db_path)
    connection.execute("PRAGMA page_size=4096")
    connection.execute("PRAGMA journal_mode=OFF")
    connection.execute("PRAGMA synchronous=OFF")
    connection.execute("PRAGMA temp_store=MEMORY")
    connection.executescript(
        """
        CREATE TABLE meta (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );

        CREATE TABLE entries (
            id INTEGER PRIMARY KEY,
            word TEXT NOT NULL,
            word_key TEXT NOT NULL,
            phonetic TEXT NOT NULL DEFAULT '',
            translation TEXT NOT NULL DEFAULT '',
            definition TEXT NOT NULL DEFAULT '',
            pos TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '',
            collins INTEGER NOT NULL DEFAULT 0,
            oxford INTEGER NOT NULL DEFAULT 0,
            bnc INTEGER NOT NULL DEFAULT 0,
            frq INTEGER NOT NULL DEFAULT 0,
            exchange TEXT NOT NULL DEFAULT '',
            priority INTEGER NOT NULL DEFAULT 1000000000
        );

        CREATE TABLE forms (
            form TEXT NOT NULL,
            entry_id INTEGER NOT NULL
        );
        """
    )

    started = time.time()
    count = 0
    form_count = 0

    with input_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            word = (row.get("word") or "").strip()
            if not word:
                continue
            word_key = normalize(word)
            if not word_key:
                continue

            count += 1
            frq = integer(row.get("frq"))
            bnc = integer(row.get("bnc"))
            priority = min((rank for rank in (frq, bnc) if rank > 0), default=1_000_000_000)
            exchange = (row.get("exchange") or "").strip()

            connection.execute(
                """
                INSERT INTO entries (
                    id, word, word_key, phonetic, translation, definition,
                    pos, tags, collins, oxford, bnc, frq, exchange, priority
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    count,
                    word,
                    word_key,
                    (row.get("phonetic") or "").strip(),
                    (row.get("translation") or "").strip(),
                    (row.get("definition") or "").strip(),
                    (row.get("pos") or "").strip(),
                    (row.get("tag") or "").strip(),
                    integer(row.get("collins")),
                    integer(row.get("oxford")),
                    bnc,
                    frq,
                    exchange,
                    priority,
                ),
            )

            for form in exchange_forms(exchange):
                connection.execute(
                    "INSERT INTO forms (form, entry_id) VALUES (?, ?)",
                    (form, count),
                )
                form_count += 1

            if count % 25_000 == 0:
                print(f"entries: {count:,}", flush=True)

    connection.executemany(
        "INSERT INTO meta (key, value) VALUES (?, ?)",
        [
            ("schema_version", str(SCHEMA_VERSION)),
            ("data_version", str(version)),
            ("entry_count", str(count)),
            ("source", "ECDICT"),
            ("source_url", ECDICT_SOURCE),
            ("source_commit", source_commit),
            ("license", "MIT"),
            ("built_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
        ],
    )
    connection.execute("CREATE INDEX entries_word_key ON entries(word_key, priority)")
    connection.execute("CREATE INDEX forms_form ON forms(form, entry_id)")
    connection.commit()
    connection.execute("VACUUM")
    connection.close()

    print(f"entries: {count:,}; forms: {form_count:,}; sqlite: {db_path.stat().st_size / 1024 / 1024:.1f} MB", flush=True)
    print("compressing...", flush=True)
    with db_path.open("rb") as source, gz_path.open("wb") as target:
        with gzip.GzipFile(filename="", mode="wb", fileobj=target, compresslevel=9, mtime=0) as archive:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                archive.write(chunk)

    digest = sha256_file(gz_path)
    manifest = {
        "schema": SCHEMA_VERSION,
        "version": version,
        "entries": count,
        "file": gz_path.name,
        "url": pack_url or f"{base_url.rstrip('/')}/v{version}/{gz_path.name}",
        "mirror": mirror_url or None,
        "bytes": gz_path.stat().st_size,
        "sha256": digest,
        "license": "MIT",
        "source": "ECDICT",
        "sourceCommit": source_commit,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"gzip: {gz_path.stat().st_size / 1024 / 1024:.1f} MB", flush=True)
    print(f"sha256: {digest}", flush=True)
    print(f"elapsed: {time.time() - started:.1f}s", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", default=Path("build/ecdict"), type=Path)
    parser.add_argument("--version", default=1, type=int)
    parser.add_argument(
        "--base-url",
        default="https://amoshydra.github.io/souzi/ecdict",
    )
    parser.add_argument("--mirror-url", default="")
    parser.add_argument(
        "--pack-url",
        help="Explicit public URL of the .sqlite.gz artifact; overrides --base-url.",
        default="",
    )
    parser.add_argument(
        "--source-commit",
        default=os.environ.get("ECDICT_SOURCE_COMMIT", ""),
    )
    args = parser.parse_args()
    build(
        args.input.resolve(),
        args.output_dir.resolve(),
        args.version,
        args.base_url,
        args.mirror_url,
        args.source_commit,
        args.pack_url or None,
    )


if __name__ == "__main__":
    main()
