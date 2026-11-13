import hashlib
import json
from datetime import date
from pathlib import Path

from stackserve_rag.protocol import CORPUS_VERSION, Chunk, Filters, Section

ROOT = Path(__file__).resolve().parents[4]
CORPUS_DIR = ROOT / "corpus"


class IntegrityError(ValueError):
    pass


def read_bounded(path: Path, maximum: int) -> bytes:
    with path.open("rb") as stream:
        value = stream.read(maximum + 1)
    if len(value) > maximum:
        raise IntegrityError("artifact_size_limit")
    return value


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_corpus(directory: Path = CORPUS_DIR) -> tuple[list[Section], str]:
    manifest = json.loads(read_bounded(directory / "manifest.json", 16_384))
    raw = read_bounded(directory / "sections.json", 262_144)
    if manifest.get("corpus_version") != CORPUS_VERSION:
        raise IntegrityError("corpus_version_mismatch")
    if manifest.get("sections_sha256") != digest(raw):
        raise IntegrityError("corpus_hash_mismatch")
    data = json.loads(raw)
    if not isinstance(data, list) or not 30 <= len(data) <= 50:
        raise IntegrityError("corpus_section_count")
    sections = [Section.model_validate(item) for item in data]
    if len({item.id for item in sections}) != len(sections):
        raise IntegrityError("duplicate_section_id")
    for section in sections:
        if section.content_hash != digest(section.text.encode()):
            raise IntegrityError("section_hash_mismatch")
    return sections, digest(raw)


def matches(section: Section, filters: Filters) -> bool:
    for name in ("provider", "product", "runtime_version", "document_type"):
        value = getattr(filters, name)
        if value is not None and value != getattr(section, name):
            return False
    return filters.region is None or filters.region in section.regions


def with_freshness(section: Section, today: date) -> Chunk:
    fetched = date.fromisoformat(section.fetched_at)
    verified = date.fromisoformat(section.verified_at) if section.verified_at else None
    if fetched > today or (verified and (verified > today or verified < fetched)):
        state = "invalid_date"
    elif section.superseded:
        state = "superseded"
    elif verified is None:
        state = "unverified"
    elif (today - verified).days > (7 if section.document_type == "pricing" else 30):
        state = "stale"
    else:
        state = "fresh"
    return Chunk(**section.model_dump(), freshness=state)
