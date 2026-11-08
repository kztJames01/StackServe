# Retrieval implementation evidence — 7 November 2026

Scope: retrieval scope, with owner-confirmed provider combinations recorded in
`specs/retrieval.md` and `corpus/manifest.json`. No pricing formulas, deployment
bundles, cloud resources, publishing or release status changed.

## Implemented

- 36 reviewed summaries from 24 official pages, with stable IDs, heading/parent
  context, source and summary hashes, dates, document types and supersession.
- Pinned Apache-2.0 MiniLM revision, 384-dimensional CPU ONNX embeddings,
  mean pooling, normalized cosine search and an explicit offline index build.
- BM25 plus RRF hybrid retrieval; exact provider/product/runtime/region/type
  filters; one optional follow-up and a combined eight-chunk maximum.
- Shared protocol v2 in Rust, Python, JSON Schema and fixtures. Rust validates
  response source hosts, filters, uniqueness, status and readiness boundaries.
- Seven-day pricing and thirty-day other-evidence freshness. Future, unverified
  and superseded records cannot be fresh. Retrieval never self-certifies a
  requirement or deployment.
- Explicit lexical fallback for absent vector artifacts/runtime; installed
  mismatched or malformed indexes fail closed. Queries remain in memory and
  common secret forms are redacted before retrieval. Diagnostics omit queries.

## Checks executed

- `cargo fmt --all -- --check`: passed.
- `cargo clippy --all-targets --all-features -- -D warnings`: passed.
- `cargo test --all-features --workspace`: 16 passed.
- `uv sync --locked --offline`: passed using the populated temporary uv cache.
- `uv sync --locked --extra vector --offline`: passed using that same cache.
- Ruff check and format check: passed.
- Python pytest with `STACKFIT_PROFILE_BIN` set: 30 passed, no skips in the base
  environment. The earlier vector-environment run passed all 29 tests present
  before the final credential-redaction regression test was added.
- MCP stdio integration: initialize with protocol `2025-11-25`, tools/list,
  schema-validated search arguments, two repeated tools/call requests using
  provider filtering, follow-up and limit=2, then clean EOF shutdown. Exercised
  through client `stackfit-contract-test` version 1 in both install modes.
- CLI base-mode search: status=ok, retrieval_mode=lexical,
  warning=vector_runtime_unavailable, needs_verification=true,
  verified_ready=false. No stdout diagnostics.
- Real local hybrid evaluation: 20 labeled queries; lexical and hybrid both
  achieve 1.0000 macro Recall@5 over 18 positive cases. Two exact-filter missing
  cases return no evidence. See `evals/reports/retrieval-2026-11-07.md`.
- Original source headings and summary attribution inspected against cached
  official Markdown. Model SHA-256 matches the pinned upstream ONNX LFS digest.
- `git diff --check`: passed. Model, index and raw source cache remain ignored.

## Counterexamples and limits

Tests cover stale boundaries, future dates, supersession, unavailable runtime,
missing model, mismatched revision/dimension/index, nonfinite vectors, corrupt
corpus hashes, unofficial URLs, duplicate/filter-violating responses, oversized
worker input, private query redaction and vendor instruction text treated as data.
The inherited worker crash, timeout and cancellation tests remain green.

The small development evaluation does not establish hybrid superiority. An
additional unfiltered private-discount query retrieved unrelated sections;
this is recorded in the eval report. No synthesized answer or verified-ready
claim is emitted. Conflicting-claim probes and supersession test conservative
labeling, not automatic contradiction resolution. Runtime version metadata is
unknown in these rolling provider docs, so exact version filters return no
unsupported compatibility claim.

The Rust compatibility check initially caught use of an API newer than the
workspace's declared MSRV; this was fixed before the passing run. The local
embedding/index artifacts are prepared; OCI packaging is tracked separately.
Remote CI and branch protection were not verified in this task.
