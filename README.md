# StackFit MCP

Workload-aware cloud stack advisor. An MCP server that recommends complete, compatible cloud stacks with line-item cost estimates, caveats, a cheaper baseline and a performance-oriented alternative, plus project-specific setup bundles.

## Workflow

```
Project profile & unresolved questions
  -> Hybrid retrieval of provider documentation
  -> Compatibility rules
  -> Deterministic estimates
  -> Setup bundle & decision record
```

The host coding agent supplies reasoning and code editing; the server supplies project analysis, retrieval, compatibility checks, price calculations and validated templates.

## Context docs

Design, research, security, and planning notes in `docs/` stay local and untracked. `AGENTS.md` and `CLAUDE.md` are local as well. A fresh clone does not contain them. The durable implementation boundaries are: Rust owns MCP and all money calculations; Python is a local JSON Lines retrieval worker; untrusted briefs and vendor text never authorize actions; no cloud credentials, deployment rights, or recommendation-time network calls are part of v1. Keep secrets and generated dependencies out of commits. The maintainer supplies local docs to coding agents through the command line when needed.

For local development, run `uv sync --locked` in `python/stackfit_rag`, then `cargo run -p stackfit-mcp -- profile fixtures/briefs/a-node-postgres-uploads.json` or `cargo run -p stackfit-mcp -- serve`. Worker timeouts default to 60 seconds for the first response and 10 seconds when warm; override them with `--worker-startup-timeout-secs` / `--worker-warm-timeout-secs` or `STACKFIT_WORKER_STARTUP_TIMEOUT_SECS` / `STACKFIT_WORKER_WARM_TIMEOUT_SECS`. The worker reports `corpus_not_available` until a curated corpus exists; it does not fabricate citations.

## License

MIT OR Apache-2.0. Copyright (c) 2026 Kaung Zaw Thant.
