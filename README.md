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

For local development, run `uv sync --locked` in `python/stackfit_rag`, then `cargo run -p stackfit-mcp -- profile fixtures/briefs/a-node-postgres-uploads.json`, `cargo run -p stackfit-mcp -- recommend fixtures/workloads/node-sporadic.json`, `cargo run -p stackfit-mcp -- bundle fixtures/projects/a-node-uploads.json`, or `cargo run -p stackfit-mcp -- serve`. Worker timeouts default to 60 seconds for the first response and 10 seconds when warm; override them with `--worker-startup-timeout-secs` / `--worker-warm-timeout-secs` or `STACKFIT_WORKER_STARTUP_TIMEOUT_SECS` / `STACKFIT_WORKER_WARM_TIMEOUT_SECS`. Retrieval includes 48 curated provider sections and bounded `search_provider_docs` retrieval. Searches work offline in lexical mode by default; the optional pinned model and prebuilt index enable hybrid mode. See [corpus setup and maintenance](corpus/README.md) and the [20-query evaluation](evals/reports/retrieval-2026-11-07.md). Retrieval and generated setup bundles (`status: prepared`) always require verification; freshness or template generation does not establish deployment readiness.

## Container

The whole server is one OCI image: Rust binary, locked Python worker, catalog,
corpus, recipes, and schemas. Use `-i` and no TTY so MCP stdio framing is not
corrupted.

```console
docker buildx build --platform linux/amd64 -t stackfit-mcp:local --load .
docker run -i --network none stackfit-mcp:local
```

`--network none` is supported because all retrieval is local. The image is
lexical-only: it installs the base Python dependencies, not the optional
`vector` extra (`numpy`, `onnxruntime`, `tokenizers`), and it does not contain
the ONNX model or index. Without them search reports
`vector_runtime_unavailable` and still answers lexically. Build, run, platform,
and artifact details are in [specs/mcp-oci.md](specs/mcp-oci.md).

## Reproduce the five-tool demo

Requirements: the pinned Rust toolchain, Python 3.12 and uv for development;
Docker for the self-contained image. No cloud credentials are required.

```sh
(cd python/stackfit_rag && uv sync --locked)
cargo build -p stackfit-mcp --locked
python3 scripts/container_smoke.py --binary target/debug/stackfit-mcp
```

The demo uses only synthetic fixtures. Expected output includes all five tool
names, `selected_total: {"usd": "10.600"}`, `bundle_status: "prepared"`,
`needs_verification: true`, and `retrieval_mode: "lexical"`. Costs are a pinned
snapshot estimate, not a current quote. The command exits nonzero on a failed
call, invalid result or timeout. Local binary execution uses host networking;
container execution below enforces offline operation.

```sh
docker buildx build --platform linux/arm64 -t stackfit-mcp:local --load .
python3 scripts/container_smoke.py --image stackfit-mcp:local --platform linux/arm64 --network none
```

Use `linux/amd64` on Intel/AMD hosts. Cross-platform emulation is not native
platform validation. The smoke sends inputs over stdin; no project mounts,
cloud credentials or deployment permissions are needed.

## MCP client configuration

For clients accepting `mcpServers` JSON (for example Cursor's `.cursor/mcp.json`),
merge this entry without replacing other configured servers:

```json
{
  "mcpServers": {
    "stackfit": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "--network", "none", "stackfit-mcp:local"]
    }
  }
}
```

For Codex: `codex mcp add stackfit -- docker run --rm -i --network none stackfit-mcp:local`.
For other hosts, use the same executable and argument array with their documented
stdio configuration. Listing acceptance is separate from local installation.
Use the published digest in place of the local tag only after release approval;
see [release procedure](specs/release.md) and [readiness evidence](reports/launch-readiness.md).

## Privacy, verification and limits

Project snippets are supplied by the host, processed locally, and never added to
the public provider corpus. The product does not provision resources, collect
telemetry, or require cloud credentials. The host may independently send tool
inputs and outputs to its model provider; review that host's privacy settings.
Never supply real environment values or private keys as project evidence.

Check each estimate's source URL and `checked_at` against official provider terms
before purchase. Missing essential prices or eligibility remain conditional;
retrieval results and prepared setup files do not establish deployment readiness.
Recipe A and B have setup templates. Recipe C/D are estimate-only; EUR estimates
require an explicit currency-comparison policy before USD ranking. The image is
lexical-only, and freshness does not prove that a claim is correct.

## Updating sourced service cards

1. Review official regional pricing, units, allowances, eligibility and exclusions.
2. Update `catalog/catalog.json` with the source URL, checked date and decimal
   formula. Unmodeled meters remain unknown; never invent a zero price.
3. Write a failing boundary/regression test beside the affected Rust module, then
   make the smallest change. Review pricing/eligibility changes with the maintainer.
4. Run Rust tests, catalog and recipe checks, Python checks, and the offline demo.
   Preserve the failing/passing evidence and describe the source change in the commit.

## License

MIT OR Apache-2.0. Copyright (c) 2026 Kaung Zaw Thant.

Aikido Security is discovery-only: free allowances are documented, but eligibility
and paid upgrades are not modeled or included in recipe totals. Lifecycle evidence
and remaining verification gaps are recorded in [the evidence report](reports/lifecycle-evidence.md).
