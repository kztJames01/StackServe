# StackServe MCP

Workload-aware cloud stack advisor. An MCP server that recommends complete, compatible cloud stacks with line-item decimal cost estimates, caveats, a cheaper baseline and a performance-oriented alternative, plus project-specific setup bundles.

Five MCP tools: `profile_project`, `search_provider_docs`, `recommend_stacks`, `compare_stacks`, and `generate_setup_bundle`.

## Workflow

```
Project profile & unresolved questions
  -> Hybrid/lexical retrieval of provider documentation
  -> Compatibility rules
  -> Deterministic decimal estimates
  -> Setup bundle & decision record
```

### Quick start (CLI & local MCP)

```sh
(cd python/stackserve_rag && uv sync --locked)
cargo build -p stackserve-mcp --release

# CLI workflow
./target/release/stackserve-mcp profile fixtures/briefs/a-node-postgres-uploads.json
./target/release/stackserve-mcp search "Render PORT binding"
./target/release/stackserve-mcp recommend fixtures/workloads/node-sporadic.json
./target/release/stackserve-mcp compare fixtures/workloads/node-sporadic.json \
  --stack "recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-free+cloudflare-r2-standard"
./target/release/stackserve-mcp bundle fixtures/projects/a-node-uploads.json

# Start MCP server (stdio)
./target/release/stackserve-mcp serve
```

### Docker (offline stdio)

```sh
docker buildx build -t stackserve-mcp:local --load .
docker run --rm -i --network none stackserve-mcp:local
```

## Privacy & limits

- Project inputs are processed locally; StackServe does not provision resources, collect telemetry, or require cloud credentials. Never supply real secrets as project evidence.
- Estimates use a pinned catalog snapshot—always verify each line item's `source_url` and `checked_at` against official provider pricing and terms before purchase.

## License

MIT OR Apache-2.0. Copyright (c) 2026 Kaung Zaw Thant.
