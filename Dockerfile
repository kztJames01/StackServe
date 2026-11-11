# syntax=docker/dockerfile:1.7
# StackFit MCP — one OCI image with the Rust MCP server, the locked Python
# retrieval worker, and the curated corpus. Hybrid retrieval artifacts are not
# baked in; see README for the optional model/index mount.

FROM rust:1.94.0-slim-bookworm@sha256:a86cada82e36ebd7a9bffed7548792c55a952fdb20718eea9278a936bcb76e62 AS rust-builder
WORKDIR /app
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY crates ./crates
COPY catalog ./catalog
COPY corpus ./corpus
COPY recipes ./recipes
COPY schemas ./schemas
RUN cargo build --release --locked -p stackfit-mcp

FROM python:3.12.7-slim-bookworm@sha256:60d9996b6a8a3689d36db740b49f4327be3be09a21122bd02fb8895abb38b50d AS python-builder
COPY --from=ghcr.io/astral-sh/uv:0.12.23@sha256:61d393e44e249f2e4b526b6c7ddcecce245946826e608e11c93ad4f5bba55b21 /uv /uvx /usr/local/bin/
WORKDIR /app/python/stackfit_rag
COPY python/stackfit_rag/pyproject.toml python/stackfit_rag/uv.lock python/stackfit_rag/.python-version ./
COPY python/stackfit_rag/src ./src
RUN uv sync --locked --no-dev

FROM python:3.12.7-slim-bookworm@sha256:60d9996b6a8a3689d36db740b49f4327be3be09a21122bd02fb8895abb38b50d AS runtime
WORKDIR /app
LABEL org.opencontainers.image.title="StackFit MCP" \
      org.opencontainers.image.description="Workload-aware cloud stack advisor with cited evidence and deterministic decimal pricing" \
      org.opencontainers.image.licenses="MIT OR Apache-2.0" \
      org.opencontainers.image.source="https://github.com/kztJames01/stackfit-mcp"

# The worker and corpus live at stable absolute paths so the editable Python
# install and the runtime root agree. Public stdout remains MCP-only.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    STACKFIT_ROOT=/app \
    STACKFIT_PYTHON=/app/python/stackfit_rag/.venv/bin/python

RUN groupadd --system --gid 10001 stackfit \
    && useradd --system --uid 10001 --gid stackfit --home-dir /app --no-create-home stackfit

COPY --from=rust-builder /app/target/release/stackfit-mcp /usr/local/bin/stackfit-mcp
COPY --from=python-builder /app/python/stackfit_rag /app/python/stackfit_rag
COPY corpus ./corpus
COPY catalog ./catalog
COPY recipes ./recipes
COPY schemas ./schemas

USER stackfit
# Run with `docker run -i` (no `-t`) so MCP stdio is not attached to a TTY.
ENTRYPOINT ["/usr/local/bin/stackfit-mcp", "serve"]
