# MCP container image contract

Scope: one OCI image that runs the Rust MCP server and the locked Python
retrieval worker over stdio. The image contains no web server, no network port,
no cloud credentials, and no telemetry. It is the whole installation: Rust 1.94
build output, Python 3.12.7 virtual environment, catalog, corpus, recipes, and
schemas.

## Build

```console
docker buildx build --platform linux/amd64 -t stackfit-mcp:local --load .
docker buildx build --platform linux/arm64 -t stackfit-mcp:local-arm64 --load .
```

The `Dockerfile` uses pinned base image digests for `rust:1.94.0-slim-bookworm`,
`python:3.12.7-slim-bookworm`, and `ghcr.io/astral-sh/uv:0.12.23`. The Rust stage
runs `cargo build --release --locked`; the Python stage runs
`uv sync --locked --no-dev`. Neither stage downloads the ONNX model or index.

## Run

```console
docker run -i --network none stackfit-mcp:local
```

- Use `-i`, never `-it`. A TTY corrupts MCP stdio framing.
- `--network none` is the supported v1 mode. The server answers from the
  catalog, corpus, recipes, and schemas copied into the image.
- The process runs as the non-root `stackfit` user (uid/gid 10001).

## Runtime layout

| Path | Purpose |
| --- | --- |
| `/usr/local/bin/stackfit-mcp` | Rust MCP server; `serve` is the entrypoint |
| `/app/python/stackfit_rag/.venv` | locked worker environment |
| `/app/corpus` | curated provider sections and `model.json` metadata |
| `/app/catalog` | pinned price cards |
| `/app/recipes` | the two deployment recipes |
| `/app/schemas` | protocol and output schemas |

Environment defaults: `STACKFIT_ROOT=/app`, `STACKFIT_PYTHON=/app/python/stackfit_rag/.venv/bin/python`,
`PYTHONUNBUFFERED=1`, `PYTHONDONTWRITEBYTECODE=1`.

## Verified builds

Built and run on an Apple Silicon macOS host on 9 Nov 2026 with Docker buildx.
Both images passed `scripts/container_smoke.py --network none`: initialize,
`tools/list` (all five tools), `recommend_stacks`, and two `search_provider_docs`
calls with distinct request IDs.

| Platform | Image ID | Size (bytes) | Cold search | Warm search |
| --- | --- | --- | --- | --- |
| `linux/arm64` | `sha256:e31c9e7e7f4d99a8d27a443541b65027cc1bedad8b4f8ee256d1f14b033ed916` | 229,123,910 | 0.422 s | 0.002 s |
| `linux/amd64` | `sha256:2c7e99eaa6652a1aa228cf23fb0f54f31effee331f265ef05266d14d9f131c32` | 204,951,742 | 0.757 s | 0.002 s |

Cold search is the first retrieval call, so it includes lazy worker startup and
corpus load. Warm search is the next call in the same process. These are tool
call timings from one representative run, not container start timings; repeated
runs vary by tens of milliseconds. The amd64 image ran under emulation on the
arm64 host; the build itself targeted a native amd64 image.

The image IDs above are local build outputs. A registry digest must be recorded
when the image is pushed (release work); do not cite a local image ID as a
published digest.

## Hybrid retrieval (not included)

The image is lexical-only. Its Python environment installs only the base
dependencies (`pydantic`); the optional `vector` extra (`numpy`, `onnxruntime`,
`tokenizers`) is not installed, and the ONNX model and index are not baked in.
Mounting `models/` and `index/` alone therefore does not enable hybrid mode.

A hybrid image would need `uv sync --locked --no-dev --extra vector` plus the
pinned artifacts below, and must still reject a mismatched model, dimension, or
index version. That image is not built or verified here.

| Artifact | Bytes |
| --- | --- |
| `models/minilm/model.onnx` | 90,405,214 |
| tokenizer | 466,247 |
| index | 406,947 |

Model: `sentence-transformers/all-MiniLM-L6-v2`, revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, Apache-2.0, 384 dimensions.

In lexical mode the server reports `vector_runtime_unavailable` and still
answers; it never compares incompatible vectors.

## Message size

MCP stdio is newline-delimited JSON. The largest response today is the setup
bundle: 76,490 bytes for `fixtures/projects/a-node-uploads.json` and 68,626
bytes for `fixtures/projects/b-python-docker.json`. Allow at least 512 KiB per
line. Python's `asyncio` default of 64 KiB is too small and fails with "chunk
is longer than limit"; the contract test sets a 1 MiB limit and asserts the
bundle stays under 256 KiB. Inputs remain bounded by the tool contracts (query
length, file count, and limit ranges).

## Known limits

- The image does not include the ONNX runtime for hybrid retrieval by default.
- Published registry digest, signature, and SBOM are release work, not part of
  this image contract.
- The container workflow is configured to build and smoke `linux/amd64`
  natively. `linux/arm64` is verified locally and is not built under emulation
  in CI.
