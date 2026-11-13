import argparse
import json
import subprocess
from pathlib import Path

from stackserve_rag.corpus import ROOT, IntegrityError, digest, load_corpus, read_bounded
from stackserve_rag.embeddings import MODEL_DIR, build_index, model_spec


def fetch(url: str, path: Path, maximum: int, redirects: bool = False) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".download")
    try:
        subprocess.run(
            [
                "curl",
                "--fail",
                "--silent",
                "--show-error",
                "--location",
                "--max-redirs",
                "5" if redirects else "0",
                "--proto",
                "=https",
                "--proto-redir",
                "=https",
                "--max-time",
                "180",
                "--max-filesize",
                str(maximum),
                "--output",
                str(temporary),
                url,
            ],
            check=True,
            timeout=190,
        )
        raw = read_bounded(temporary, maximum)
        return raw
    finally:
        temporary.unlink(missing_ok=True)


def download_model() -> None:
    spec = model_spec()
    for name, record in spec["files"].items():
        path = MODEL_DIR / name
        if path.exists() and digest(read_bounded(path, record["bytes"])) == record["sha256"]:
            continue
        url = f"https://huggingface.co/{spec['model_id']}/resolve/{spec['revision']}/{record['remote_path']}"
        raw = fetch(url, path, record["bytes"], redirects=True)
        if len(raw) != record["bytes"] or digest(raw) != record["sha256"]:
            raise IntegrityError("download_hash_mismatch")
        temporary = path.with_suffix(".download")
        temporary.write_bytes(raw)
        temporary.replace(path)
    print("Pinned model files verified; no request-time downloads are enabled.")


def refresh_sources() -> None:
    sections, _ = load_corpus()
    records = {}
    for section in sections:
        url = section.source_fetch_url
        if url in records:
            continue
        path = ROOT / "corpus-cache" / f"{digest(url.encode())}.md"
        raw = fetch(url, path, 2_000_000)
        path.write_bytes(raw)
        records[url] = {"sha256": digest(raw), "changed": digest(raw) != section.source_hash}
    print(json.dumps(records, indent=2))
    print("Review cached text manually; source dates and curated summaries were not changed.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "command", choices=["validate", "download-model", "build-index", "refresh-sources"]
    )
    command = parser.parse_args().command
    if command == "download-model":
        download_model()
    elif command == "refresh-sources":
        refresh_sources()
    else:
        sections, corpus_hash = load_corpus()
        if command == "build-index":
            build_index(sections, corpus_hash)
        print(f"{len(sections)} validated sections; corpus hash {corpus_hash}")


if __name__ == "__main__":
    main()
