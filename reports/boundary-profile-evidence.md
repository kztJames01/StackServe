# Boundary and profile verification — 7 Nov 2026

## Local checks

- `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features -- -D warnings`, and `cargo test --all-features --workspace` run with Rust 1.94.0 via the installed `stable` toolchain override. The project pins 1.94.0 for CI.
- `uv sync --locked`, `uv run ruff check .`, `uv run ruff format --check .`, and `uv run pytest` run in `python/stackfit_rag` with Python 3.12.7.
- The Rust and Python protocol tests parse the same `fixtures/protocol/request.jsonl` and `response.jsonl`.
- Both frozen briefs pass the Rust profile test and validate against `schemas/profile-output.schema.json` in the cross-language contract check. Missing usage remains `null` with `defaulted: true`; each requirement carries an evidence, inference, or assumption label. The adversarial brief is treated as data.
- Worker tests cover crash, startup timeout, and cancellation. Cancellation drops the owned child process through Tokio's `kill_on_drop` path.

## MCP Inspector CLI 2.13.0

Command target: local `stackfit-mcp serve` binary, stdio transport. Inspector `initialize` returned `serverInfo.name=stackfit-mcp`, `serverInfo.version=0.1.0`, protocol `2025-11-25`, and tools capability. Inspector `tools/call` for `profile_project` returned a labeled profile. Inspector `tools/call` for `search_provider_docs` reached the Python worker and returned `status=unavailable`, `retrieval_mode=none`, and `error=corpus_not_available`.

The official provider corpus has not been curated yet. The worker cannot truthfully produce a provider citation; the cited project facts come from selected file paths and line numbers in `profile_project`.

## External gate

CI jobs are defined in `.github/workflows/ci.yml`. The feature branch is published, but no pull request has started those checks; branch protection has not been verified.
