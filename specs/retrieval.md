# Bounded local provider retrieval

Confirmed scope: recipe A uses Cloudflare Pages, Render Node, Neon PostgreSQL,
and Cloudflare R2. Recipe B uses Render Docker/Python, Neon PostgreSQL, and R2.
This sprint retrieves evidence; it does not implement pricing or deployment.

Acceptance example: searching `Render PORT binding` with provider `render`
returns at most eight allowlisted, hashed sections with dates and freshness.
With missing local model files it explicitly reports lexical fallback. Changing
an installed index's model revision or dimension returns an error, not fallback.

Implementation: 30–50 reviewed, short source summaries with heading and parent
context; a pinned MiniLM ONNX model loaded only on first semantic query; BM25,
cosine, RRF and exact metadata filters. Model downloads and index building are
explicit maintenance commands, never request-time operations. Generated model
and index files remain ignored. Shared JSON Lines contract advances to v2.

A call accepts one requirement query and at most one optional follow-up query;
results are deduplicated and the combined output remains capped at eight.
Follow-up is supplied by the host, never generated from retrieved instructions.
Evidence alone cannot establish that an arbitrary requirement is supported:
responses always retain `needs_verification` pending host review. Stale,
superseded, future-dated or unverified evidence cannot be verified-ready.
Price freshness is seven days; other evidence uses thirty days, conservatively.

Validation: shared Rust/Python/schema fixtures; deterministic filter, freshness,
ranking, malformed-index and fallback tests; real model evaluation on twenty
labeled queries; CLI and MCP smoke tests; fmt, clippy, Rust and Python checks.
Report retrieval failures and measured Recall@5 without assuming hybrid wins.
