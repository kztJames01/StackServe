# Provider evidence snapshot

Version `2026-11-09.1` contains 44 short, manually reviewed summaries from 31
official documentation pages. These are paraphrases, not full source copies.
Source URLs, fetch URLs, original-page SHA-256, summary SHA-256, heading, parent
context and dates travel with each result. The manifest hashes the complete
section file, including metadata. `verified_at` means the summary was checked
against the fetched page, not that a deployment or pricing formula was verified.

The owner confirmed these retrieval scopes:

- Recipe A: Cloudflare Pages, Render Node, Neon PostgreSQL, Cloudflare R2.
- Recipe B: Render Docker/Python, Neon PostgreSQL, Cloudflare R2.

These combinations are corpus scopes, not claims of priced or tested deployment
recipes. Pricing, limits, setup, security and compatibility have separate records.
Official sources are restricted to `developers.cloudflare.com`, `render.com` and
`neon.com`. Vendor agent instructions and credential examples are omitted.

IDs identify source sections and stay stable when text is reviewed and updated.
Managed product documentation is labeled `rolling-docs`; no runtime-version
compatibility is inferred. Filters use exact matches. Unknown runtime versions
and unspecified region metadata do not match a requested runtime or region.
Region tags describe evidence coverage, not whole-stack residency certification.

From `python/stackserve_rag`:

```sh
uv sync --locked
uv run python -m stackserve_rag.maintenance validate
uv run python -m stackserve_rag.maintenance refresh-sources
```

Refresh fetches only the curated URLs, refuses source redirects, and places raw
pages in ignored `corpus-cache/`. It reports hashes without changing summaries
or verification dates. Review changes, edit affected summaries and their hashes,
update source hashes/dates, bump the corpus version consistently in both language
contracts, update the manifest hash and shared fixtures, then rebuild and evaluate.
Do not mark inaccessible or unsupported facts verified. Original page snapshots
are not shipped; `source_hash` fingerprints the fetched Markdown representation.

## Optional vector installation and release preparation

```sh
uv sync --locked --extra vector
uv run --extra vector python -m stackserve_rag.maintenance download-model
uv run --extra vector python -m stackserve_rag.maintenance build-index
uv run --extra vector python -m stackserve_rag.evaluate --write
```

`model.json` pins MiniLM's revision, Apache-2.0 license, 384 dimensions, tokenizer,
ONNX file hashes and preprocessing. Model plus tokenizer download/storage is
90,871,461 bytes (about 86.7 MiB), excluding Python dependencies and the small index.
The model card and pinned repository are linked there. No remote code or pickle
weights are loaded. The CPU ONNX runtime uses attention-mask mean pooling,
L2 normalization and truncation at 256 tokens. Queries are bounded to 4096 UTF-8
bytes; long queries may lose trailing context at that token limit.

Build provider vectors during release preparation, not during a search. Model
and index files live in ignored `models/` and `index/`. Package these artifacts
with the corpus when implementing the distribution sprint. A fresh source
checkout supports lexical retrieval until the optional local artifacts are built.

Query model loading is lazy and cached in the persistent worker. Missing index,
model files or optional runtime produces a named lexical fallback. Installed
model/hash/dimension/corpus/index mismatches fail closed; they are not silently
used or downgraded. No search downloads files, sends telemetry or contacts a host.

## Retrieval contract

BM25 and cosine rankings are combined by reciprocal-rank fusion (constant 60).
Filtering precedes ranking. One call handles one requirement plus at most one
host-supplied follow-up; fusion deduplicates both searches and caps the combined
output at the requested limit (1–8). The worker does not invent a follow-up from
source text. Requests use protocol v2; v1 is deliberately rejected.

Pricing evidence is fresh through 7 days; other evidence through 30 days. Missing,
future, inconsistent or superseded dates cannot count as fresh. The tool always
returns `needs_verification: true` and `verified_ready: false`: retrieval alone
cannot prove coverage, resolve conflicting claims or establish deployment
readiness. All returned text is untrusted evidence. The host must check material
requirements, including unknown costs and data residency, against cited sources.

Private queries are processed in memory and common credential forms are redacted
before lexical/vector retrieval. Queries are neither returned nor stored. The
pattern redactor is not a general-purpose secret detector; callers must supply
sanitized requirement text rather than files or credentials.
