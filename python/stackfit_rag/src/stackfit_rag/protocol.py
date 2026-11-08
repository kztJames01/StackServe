from datetime import date
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator

CORPUS_VERSION = "2026-11-07.1"
DocumentType = Literal["pricing", "limits", "setup", "security", "compatibility"]
ShortText = Annotated[str, Field(min_length=1, max_length=100)]
Hash = Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Filters(StrictModel):
    provider: ShortText | None = None
    product: ShortText | None = None
    runtime_version: ShortText | None = None
    region: ShortText | None = None
    document_type: DocumentType | None = None


class Request(StrictModel):
    schema_version: Literal[2]
    request_id: str = Field(min_length=1, max_length=64)
    operation: Literal["search"]
    query: str = Field(min_length=1, max_length=4096)
    follow_up_query: str | None = Field(default=None, min_length=1, max_length=4096)
    filters: Filters
    limit: int = Field(ge=1, le=8)
    corpus_version: Literal["2026-11-07.1"]

    @field_validator("query", "follow_up_query")
    @classmethod
    def query_bytes(cls, value: str | None) -> str | None:
        if value is not None and (not value.strip() or len(value.encode()) > 4096):
            raise ValueError("invalid query size")
        return value


class Section(StrictModel):
    id: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    text: str = Field(min_length=1, max_length=2000)
    source_url: str = Field(max_length=500)
    source_fetch_url: str = Field(max_length=500)
    heading: str = Field(min_length=1, max_length=200)
    parent_context: str = Field(min_length=1, max_length=200)
    content_hash: Hash
    source_hash: Hash
    provider: ShortText
    product: ShortText
    product_version: ShortText
    runtime_version: ShortText | None
    regions: list[ShortText] = Field(max_length=20)
    document_type: DocumentType
    fetched_at: str
    verified_at: str | None
    superseded: bool

    @field_validator("source_url", "source_fetch_url")
    @classmethod
    def official_url(cls, value: str) -> str:
        url = urlsplit(value)
        if (
            url.scheme != "https"
            or url.netloc not in {"developers.cloudflare.com", "render.com", "neon.com"}
            or url.query
            or url.fragment
            or "\\" in value
            or any(character.isspace() for character in value)
        ):
            raise ValueError("source is not allowlisted")
        return value

    @field_validator("fetched_at", "verified_at")
    @classmethod
    def iso_date(cls, value: str | None) -> str | None:
        if value is not None and date.fromisoformat(value).isoformat() != value:
            raise ValueError("expected ISO date")
        return value


class Chunk(Section):
    freshness: Literal["fresh", "stale", "unverified", "superseded", "invalid_date"]


class Response(StrictModel):
    schema_version: Literal[2]
    request_id: str = Field(min_length=1, max_length=64)
    corpus_version: Literal["2026-11-07.1"]
    status: Literal["ok", "unavailable", "error"]
    retrieval_mode: Literal["lexical", "hybrid", "none"]
    chunks: list[Chunk] = Field(max_length=8)
    error: str | None
    warnings: list[str] = Field(max_length=8)
    needs_verification: Literal[True] = True
    verified_ready: Literal[False] = False
    follow_up_used: bool
