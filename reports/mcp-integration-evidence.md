# MCP integration and container evidence

Date: 9 Nov 2026. Scope: five MCP tools over stdio, Inspector and named-host
smoke tests, worker failure modes, offline behavior, and the OCI image.
Container contract: [specs/mcp-oci.md](../specs/mcp-oci.md).

## Versions

| Component | Version |
| --- | --- |
| Rust / Cargo | 1.94.0 |
| `rmcp` | 3.9.0 |
| Python / Pydantic | 3.12.7 / 2.12.5 |
| MCP Inspector | 2.14.0 |
| Node (Inspector only) | 24.10.0 |
| OpenCode (named host) | 2.2.6 |
| Docker / buildx | 29.9.2 / 0.38.1 |

Test binary: `target/debug/stackfit-mcp` built from the working tree.

## Five tools over stdio

`tools/list` returns exactly `profile_project`, `search_provider_docs`,
`recommend_stacks`, `compare_stacks`, and `generate_setup_bundle`. The schema
portability check was run with:

```console
$ npx -y @modelcontextprotocol/inspector@2.14.0 --cli --cwd "$PWD" \
    ./target/debug/stackfit-mcp serve --method tools/list --strict
...
0 errors, 6 warnings across 1 tool.
```

The six warnings are all legal JSON Schema nullable types (`["string","null"]`)
on `search_provider_docs.follow_up_query` and the five `filters` fields. They
are recorded verbatim in
[`reports/transcripts/inspector-tools-list-strict.err`](transcripts/inspector-tools-list-strict.err).
No schema uses a bare `true` or an unresolvable `$ref`.

## Defects found by new tests and fixed

Each was reproduced before the fix.

| Defect | Red evidence | Fix |
| --- | --- | --- |
| `STACKFIT_ROOT` was ignored; the worker path was fixed at build time, so the image could not find `/app`. | `root_override` test read the build-time path instead of the temp root. | `root_dir()` reads `STACKFIT_ROOT`; an empty value now falls back instead of resolving to the current directory. Two integration tests. |
| Tool failures were plain `Error: ...` text, so hosts could not branch on a code. | The missing-worker test asserted a stable code and failed. | Every tool failure is JSON: `status`, `tool`, `error.code`, and the full `anyhow` cause chain. |
| Every search request reused `request_id: "mcp-1"`. | Two calls returned the same id. | An atomic per-process counter produces `mcp-1`, `mcp-2`, …; the Python round-trip asserts two distinct ids. |
| Four tools declared their object parameter as bare `true` in JSON Schema, which is valid JSON Schema but not portable to hosts with a narrower dialect. | Inspector `--strict` reported schema errors. | Parameters are `serde_json::Map<String, Value>`, which emits `{"type":"object","additionalProperties":true}`. |

The bundle handoff is covered by
`test_bundle_is_a_diff_handoff_and_writes_nothing`: the CLI returns five files
and the working directory listing is unchanged.

## Worker failure modes

`crates/stackfit-mcp/src/worker.rs` has eight tests: default 60 s startup and
10 s warm timeouts, configurable timeouts, hung worker timeout, warm timeout
after a first response, crash before any response, crash after a first response,
cancellation discarding the worker, and rejection of a single line above
65,536 bytes. `test_retrieval_unavailable_preserves_deterministic_tools` starts
the server with a missing interpreter, gets
`status: "unavailable"` / `error.code: "retrieval_unavailable"` from search, and
still gets results from `profile_project`, `recommend_stacks`,
`compare_stacks`, and `generate_setup_bundle`.

## Inspector

All five tools were called with the Inspector CLI and their raw outputs saved:

| Tool | Transcript | Observed |
| --- | --- | --- |
| `profile_project` | `transcripts/inspector-profile.json` | 17 requirements, 8 questions, `needs_verification: true` |
| `search_provider_docs` | `transcripts/inspector-search.json` | `status: ok`, `retrieval_mode: lexical`, 2 chunks |
| `recommend_stacks` | `transcripts/inspector-recommend.json` | 2 selections, `$10.600` and `$17.135` per month |
| `compare_stacks` | `transcripts/inspector-compare.json` | 2 stacks × 3 scenarios, 2 billing cliffs |
| `generate_setup_bundle` | `transcripts/inspector-bundle.json` | `status: prepared`, `validation.valid: true`, 5 files |

Inputs: the fixtures in `fixtures/briefs/`, `fixtures/workloads/`, and
`fixtures/projects/`; the compare stack ids came from the recommend output.
Every priced line in `inspector-recommend.json` and `inspector-compare.json`
carries its `source_url` and `checked_at` (`2026-11-07`); totals are decimal
strings from `rust_decimal`, never floats.

## Named host: OpenCode 2.2.6

`opencode mcp add stackfit -- <binary> serve` wrote the local server config;
`opencode mcp list` reported `stackfit connected`. One `opencode run` session
made all five calls in order and reported `completed` for each. No `write` or
`edit` tool ran, so the bundle stayed a returned file set. Full transcript:
[`reports/transcripts/opencode-host-2.2.6.md`](transcripts/opencode-host-2.2.6.md).

Limit: the host truncated a combined code-mode output at about 51 KB, so the
named-host transcript is evidence of integration and ordering, not a substitute
for the raw Inspector payloads.

## Message size

The setup bundle is one JSON-RPC line: 76,490 bytes for recipe A and 68,626
bytes for recipe B. That is above Python `asyncio`'s 64 KiB default reader
limit, which fails with "chunk is longer than limit". The contract test now
sets a 1 MiB limit and asserts the bundle stays under 256 KiB. Allow at least
512 KiB per line; this is documented in
[specs/mcp-oci.md](../specs/mcp-oci.md).

## Offline behavior

Both container runs used `--network none`. The smoke initialized, listed the
five tools, recommended a stack, and ran two searches with distinct request
IDs. The second search was warm. The container had no network interface, so a
socket attempt would have failed; every call succeeded from the baked virtual
environment and `/app/corpus`.

## Container

Built with `docker buildx build --platform <arch> -t <tag> --load .` and run
through `scripts/container_smoke.py`:

| Platform | Image ID | Size (bytes) | Cold search | Warm search |
| --- | --- | --- | --- | --- |
| `linux/arm64` | `sha256:e31c9e7e7f4d99a8d27a443541b65027cc1bedad8b4f8ee256d1f14b033ed916` | 229,123,910 | 0.422 s | 0.002 s |
| `linux/amd64` | `sha256:2c7e99eaa6652a1aa228cf23fb0f54f31effee331f265ef05266d14d9f131c32` | 204,951,742 | 0.757 s | 0.002 s |

Cold search includes lazy worker startup and corpus load. Timings are from one
representative run and vary between runs. The amd64 image ran under emulation on
an arm64 host. The container workflow is configured to build and smoke amd64
natively; arm64 is verified locally only.

The image is lexical-only: it does not install the optional `vector` extra
(`numpy`, `onnxruntime`, `tokenizers`) and does not bake the ONNX model or
index. Retrieval reports `vector_runtime_unavailable` and still answers. Model
metadata: `sentence-transformers/all-MiniLM-L6-v2`, revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, Apache-2.0, 384 dimensions. Artifact
sizes and the requirements for a hybrid image are in
[specs/mcp-oci.md](../specs/mcp-oci.md).

## Checks run

```console
$ cargo fmt --all -- --check
$ cargo clippy --all-targets --all-features -- -D warnings
$ cargo test --all-features --workspace
  82 + 14 + 8 + 2 = 106 tests passed
$ uv run ruff check . && uv run ruff format --check .
$ STACKFIT_PROFILE_BIN=$PWD/target/debug/stackfit-mcp uv run pytest
  38 passed
$ cargo test -p stackfit-core protocol::tests::shared_fixture
  1 passed
$ uv run pytest tests/test_protocol.py
  7 passed
$ python3 scripts/container_smoke.py --image stackfit-mcp:sprint5-amd64 \
    --platform linux/amd64 --network none
  lexical, 5 tools, distinct request IDs
```

## Gaps

- A registry digest, signature, and SBOM are not produced: the image is loaded
  locally, not pushed. The IDs above are local build outputs.
- Hybrid retrieval is not supported by the default image: the optional `vector`
  extra and the ONNX artifacts are absent, and only lexical mode is exercised.
- `linux/amd64` ran under emulation on the build host; native amd64 hardware was
  not used.
- OpenCode v2.2.6 did not list the server on the first `mcp list` immediately
  after `mcp add`; the next invocation did. The config file is recorded, so the
  check is reproducible.
- `.github/workflows/container.yml` is written but has not run on GitHub yet;
  the build and smoke results above are local. The workflow verifies the
  `Dockerfile` casing, builds `linux/amd64` natively, and runs the same smoke
  script with `--network none`.
