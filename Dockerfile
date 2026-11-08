# syntax=docker/dockerfile:1
# StackFit MCP — OCI image (Rust runtime + Python RAG worker + corpus)

FROM rust:1.85-slim-bookworm AS rust-builder
WORKDIR /app
# COPY Cargo.toml Cargo.lock ./
# COPY crates ./crates
# RUN cargo build --release -p stackfit-mcp

FROM python:3.12-slim-bookworm AS python-builder
WORKDIR /app
RUN pip install --no-cache-dir uv
# COPY python/stackfit_rag ./python/stackfit_rag
# COPY uv.lock pyproject.toml ./
# RUN uv sync --locked --no-dev

FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app

# Rust binary
# COPY --from=rust-builder /app/target/release/stackfit-mcp /usr/local/bin/stackfit-mcp

# Python environment
# COPY --from=python-builder /app/.venv /app/.venv
# ENV PATH="/app/.venv/bin:$PATH"

# Corpus and recipes
# COPY catalog ./catalog
# COPY recipes ./recipes
# COPY schemas ./schemas

ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["/usr/local/bin/stackfit-mcp"]
