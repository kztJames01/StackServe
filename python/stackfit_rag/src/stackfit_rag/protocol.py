from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Filters(StrictModel):
    provider: str | None = Field(max_length=100)
    product: str | None = Field(max_length=100)


class Request(StrictModel):
    schema_version: Literal[1]
    request_id: str = Field(min_length=1, max_length=64)
    operation: Literal["search"]
    query: str = Field(max_length=4096)
    filters: Filters
    limit: int = Field(ge=1, le=8)
    corpus_version: Literal["none"]


class Chunk(StrictModel):
    id: str
    text: str
    source_url: str
    heading: str
    verified_at: str


class Response(StrictModel):
    schema_version: Literal[1]
    request_id: str = Field(min_length=1, max_length=64)
    corpus_version: Literal["none"]
    status: Literal["ok", "unavailable", "error"]
    retrieval_mode: Literal["lexical", "hybrid", "none"]
    chunks: list[Chunk] = Field(max_length=8)
    error: str | None
