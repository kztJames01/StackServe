# Retrieval evaluation — 2026-11-09

Corpus `2026-11-09.1`: 48 curated sections, SHA-256 `4ec613077e47a836992b19ad34e6298aba9a9edb9f13d28a3bc79da46b7122e9`.
Model `sentence-transformers/all-MiniLM-L6-v2` at `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, 384 dimensions; `minilm-mean-l2-256-v1`.

Command: `uv run --locked --extra vector python -m stackfit_rag.evaluate --write`.

Twenty fixed labels: 18 queries with relevant evidence and two unsupported exact-filter queries.
Macro Recall@5 averages only the 18 nonempty relevance sets; both negative cases must return no chunks.
Labels were authored from reviewed source sections before measuring. This small development set is not an independent held-out benchmark.

Lexical Recall@5: **1.0000**.
Hybrid Recall@5: **1.0000**.

| Query | Kind | Lexical Recall@5 | Hybrid Recall@5 |
| --- | --- | --- | --- |
| q01 | exact | 1.00 | 1.00 |
| q02 | exact | 1.00 | 1.00 |
| q03 | exact | 1.00 | 1.00 |
| q04 | exact | 1.00 | 1.00 |
| q05 | exact | 1.00 | 1.00 |
| q06 | semantic | 1.00 | 1.00 |
| q07 | semantic | 1.00 | 1.00 |
| q08 | semantic | 1.00 | 1.00 |
| q09 | semantic | 1.00 | 1.00 |
| q10 | semantic | 1.00 | 1.00 |
| q11 | semantic | 1.00 | 1.00 |
| q12 | exact | 1.00 | 1.00 |
| q13 | semantic | 1.00 | 1.00 |
| q14 | conflicting-claim | 1.00 | 1.00 |
| q15 | conflicting-claim | 1.00 | 1.00 |
| q16 | exact | 1.00 | 1.00 |
| q17 | missing | N/A (empty) | N/A (empty) |
| q18 | missing | N/A (empty) | N/A (empty) |
| q19 | stale | 1.00 | 1.00 |
| q20 | superseded | 1.00 | 1.00 |

## Failure inspection

No positive-label retrieval misses in this run.

Additional unsupported probe: `What is my private negotiated enterprise discount?` returned ['render-delete-lifecycle', 'render-regions-regions', 'r2-public-public', 'neon-connect-port', 'r2-pricing-meters']. None establishes a private negotiated discount. This is a relevance failure, not an answer; needs_verification remains true. No retrieval threshold was tuned on this probe.
The two missing-fact cases are scoped by provider/runtime filters; empty results retain needs_verification.
Without a restrictive filter, semantic retrieval can return loosely related evidence for an unsupported question. The tool always requires requirement review and never synthesizes an answer.
The conflicting-claim cases test false premises against official evidence (location hints versus jurisdictions; Free versus paid scale-to-zero). They do not prove automatic contradiction resolution.
The stale case advances the evaluation date by eight days for pricing. The superseded case marks an existing section superseded in memory. Neither changes the shipped corpus.

## Source attribution and operating limits

Every result carries its reviewed source URL, heading, source/content hashes, and fetch/verification dates. Unit tests reject non-allowlisted URLs and mismatched model/index metadata.
Source text is summarized evidence, not executable instructions. Freshness is a review signal, not verified deployment readiness.
First hybrid query including model load: 1796.3 ms; warm mean: 4.7 ms on this local machine. This is not a cross-platform performance claim.
