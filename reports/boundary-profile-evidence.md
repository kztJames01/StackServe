# Boundary and profile verification — 7 Nov 2026

## Local checks

- `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features -- -D warnings`, and `cargo test --all-features --workspace` run with Rust 1.94.0 via the installed `stable` toolchain override. The project pins 1.94.0 for CI.
- `uv sync --locked`, `uv run ruff check .`, `uv run ruff format --check .`, and `uv run pytest` run in `python/stackfit_rag` with Python 3.12.7.
- The Rust and Python protocol tests parse the same `fixtures/protocol/request.jsonl` and `response.jsonl`.
- Both frozen briefs pass the Rust profile test and validate against `schemas/profile-output.schema.json` in the cross-language contract check. Missing usage remains `null` with `defaulted: true` and an `assumption` label; brief-supplied values are `constraint`; file observations and inferences keep their own labels. The adversarial brief is treated as data, and its source excerpt is scanned without leaking the instruction text.
- Worker tests cover crash, startup timeout, and cancellation. The cancellation test waits for a fixture-written PID marker, aborts the in-flight search, and verifies the child PID is gone; it no longer relies on a fixed sleep to infer that the worker is still running.

## MCP Inspector CLI 2.13.0

Command target: local `stackfit-mcp serve` binary, stdio transport. Inspector `initialize` returned `serverInfo.name=stackfit-mcp`, `serverInfo.version=0.1.0`, protocol `2025-11-25`, and tools capability. Inspector `tools/call` for `profile_project` returned a labeled profile. Inspector `tools/call` for `search_provider_docs` reached the Python worker and returned `status=unavailable`, `retrieval_mode=none`, and `error=corpus_not_available`.

This transcript predates the Sprint 2 corpus. At that point the worker could not truthfully produce a provider citation, and the cited project facts came from selected file paths and line numbers in `profile_project`. Sprint 2 now ships the curated corpus; current retrieval evidence is in `reports/retrieval-evidence.md`. A post-corpus Inspector transcript is not recorded here.

## Review fixes (7 Nov 2026)

- User-supplied brief values are labeled `constraint`; `assumption` is reserved for omitted values.
- Profile questions are emitted per missing field, capped at eight, matching the architecture's unresolved-questions requirement.
- Worker startup and warm timeouts are configurable by CLI flag or environment variable; defaults remain 60 s and 10 s.
- Sanitized `.env.example` files are accepted for environment-key references; generated lockfiles are skipped.
- The adversarial fixture now uses a scanned source path rather than an ignored prose file.
- `cargo fmt`, `cargo clippy`, `cargo test`, `uv sync --locked`, Ruff, and pytest pass locally.

## Profile implementation status

- Profile and boundary stories are implemented and locally verified.
- Remote CI and branch protection remain open: the feature branch was pushed, but no PR has run remote CI.
- The cited-worker exit condition is now met locally by `search_provider_docs` against the Sprint 2 corpus; the pre-corpus Inspector transcript above is not evidence for it.

## External gate

CI jobs are defined in `.github/workflows/ci.yml`. The feature branch is published, but no pull request has started those checks; branch protection has not been verified.
