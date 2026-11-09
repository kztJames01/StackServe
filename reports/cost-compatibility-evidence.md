# Cost and compatibility evidence — 7 November 2026

Scope: catalog schema and validation, sourced service cards, deterministic decimal pricing, compatibility filtering, Pareto recommendation ranking, and multi-scenario cost comparisons (`recommend_stacks`, `compare_stacks`).

## Implemented

- Validated `ServicePlan`, `Recipe`, and `Catalog` schema (`catalog/catalog.json`, version `2026-11-07.1`) with 13 sourced service cards across Cloudflare, Render, Neon, Backblaze, Sliplane, Wasabi, Google Cloud, Hetzner, Supabase, and Railway.
- Only two complete stacks are composed as modeled (`recipe-a` and `recipe-b`); broader provider cards remain `discoverable` or `needs_manual_quote`.
- Pure decimal pricing functions using `rust_decimal::Decimal` (`crates/stackfit-core/src/pricing.rs`) with explicit units, rounding rules, relative allowances, plan minimums, and commitment checks. No floating-point arithmetic is used in any charge path.
- Hard compatibility filters (`crates/stackfit-core/src/filters.rs`) covering runtime, database engine, region/residency, commercial use, sleep tolerance, database backup, S3 API features, plan quotas, budget caps, and required capabilities.
- `recommend_stacks` and `compare_stacks` exposed in `stackfit-core`, as CLI subcommands (`recommend`, `compare`), and as MCP stdio tools.
- Credits and trials are surfaced as separate `temporary_offers` notes and never reduce recurring totals. Taxes are always listed in `excluded_items`. Currencies remain separate without an exchange rate.

## Hand-Checked End-to-End Estimates

All rates below are taken from the official vendor pages cited in `catalog/catalog.json` (checked `2026-11-07`) and asserted in `crates/stackfit-core/tests/scenarios.rs`.

### Scenario 1: Sporadic Node + PostgreSQL + Object Storage (`fixtures/workloads/node-sporadic.json`)

Workload inputs:
- `runtime`: `node`, `db_engine`: `postgresql`, `residency`: `any`, `commercial_use`: `false`, `sleep_tolerant`: `true`, `backup_required`: `false`
- `storage_gb_month`: `100`, `egress_gb`: `1000`, `writes_month`: `100,000`, `reads_month`: `1,000,000`, `requests_month`: `2,000,000`, `app_outbound_gb`: `20`, `db_gb`: `0.5`, `db_cu_hours`: `60`

#### Lowest-cost & Balanced stack: `recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-free+cloudflare-r2-standard`

| Component | Card ID | Formula & Hand Calculation | Monthly USD (`now`) | `3x` Traffic | `10x` Storage/Egress |
| --- | --- | --- | --- | --- | --- |
| Static frontend | `cloudflare-pages-free` | Fixed `$0.00` | `$0.00` | `$0.00` | `$0.00` |
| Node API (Starter, Hobby) | `render-web-starter-hobby` | Fixed `$7.00` + `max(0, 20 - 5) * $0.15 = $2.25` | `$9.25` | `$7.00 + (60 - 5) * $0.15 = $15.25` | `$7.00 + (20 - 5) * $0.15 = $9.25` |
| Database (Free) | `neon-free` | Fixed `$0.00` (`0.5 <= 1 GB`, `60 <= 100 CU-h`) | `$0.00` | `$0.00` (exceeds `100 CU-h` quota at `180 CU-h`) | `$0.00` (exceeds `1 GB` quota at `5 GB`) |
| Object storage | `cloudflare-r2-standard` | Storage `ceil(100 - 10) * $0.015 = $1.35`; Class A `100k <= 1M` (`$0.00`); Class B `1M <= 10M` (`$0.00`); egress free | `$1.35` | `$1.35` (`300k <= 1M`, `3M <= 10M`) | `ceil(1000 - 10) * $0.015 = $14.85` |
| **Total known (USD)** | | | **`$10.60`** | **`$16.60`** (quota cliff) | **`$24.10`** (quota cliff) |

#### Performance stack (no always-sleeping DB): `recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-launch+cloudflare-r2-standard`

- Render Starter + outbound: `$9.25`
- Neon Launch: `60 CU-h * $0.106 = $6.36` + `0.5 GB * $0.35 = $0.175` = `$6.535`
- Cloudflare R2 Standard: `$1.35`
- **Total known (`now`, USD):** **`$17.135`**

---

### Scenario 2: Always-on Docker/Python + PostgreSQL + Object Storage (`fixtures/workloads/python-us-always-on.json`)

Workload inputs:
- `runtime`: `docker`, `db_engine`: `postgresql`, `residency`: `us`, `commercial_use`: `false`, `sleep_tolerant`: `false`, `backup_required`: `true`
- `storage_gb_month`: `100`, `egress_gb`: `250`, `writes_month`: `100,000`, `reads_month`: `1,000,000`, `requests_month`: `2,000,000`, `app_outbound_gb`: `30`, `db_gb`: `2`, `db_cu_hours`: `200`

Rejected cheap alternative:
- `recipe-b/render-web-starter-hobby+neon-free+backblaze-b2` is rejected with `sleep_not_tolerated` (`sleep` filter) and `quota_exceeded` (`db_gb: 2 > 1`, `db_cu_hours: 200 > 100`).

#### Selected stack (`lowest_cost`, `balanced`, `performance`): `recipe-b/render-web-starter-hobby+neon-launch+backblaze-b2`

| Component | Card ID | Formula & Hand Calculation | Monthly USD (`now`) | `3x` Traffic | `10x` Storage/Egress |
| --- | --- | --- | --- | --- | --- |
| Container API (Starter, Hobby) | `render-web-starter-hobby` | Fixed `$7.00` + `max(0, 30 - 5) * $0.15 = $3.75` | `$10.75` | `$7.00 + (90 - 5) * $0.15 = $19.75` | `$10.75` |
| Database (Launch) | `neon-launch` | Compute `200 * $0.106 = $21.20`; storage `2 * $0.35 = $0.70` | `$21.90` | `600 * $0.106 + 2 * $0.35 = $64.30` | `200 * $0.106 + 20 * $0.35 = $28.20` |
| Object storage | `backblaze-b2` | Storage `((100 - 10) / 1000) * $6.95 = $0.6255`; egress `max(0, 250 - 3 * 100) * $0.01 = $0.00` | `$0.6255` | Storage `$0.6255` + egress `(750 - 300) * $0.01 = $4.50` = `$5.1255` | Storage `((1000 - 10) / 1000) * $6.95 = $6.8805`; egress `max(0, 2500 - 3000) = $0.00` |
| **Total known (USD)** | | | **`$33.2755`** | **`$89.1755`** (egress cliff at `300 GB`) | **`$45.8305`** |

## Checks Executed

- `cargo fmt --all -- --check`: passed.
- `cargo clippy --all-targets --all-features -- -D warnings`: passed.
- `cargo test --all-features --workspace`: 81 passed (64 unit tests in `stackfit-core`, 13 scenario tests in `stackfit-core`, 4 worker supervisor tests in `stackfit-mcp`).
- `uv run ruff check . && uv run ruff format --check .`: passed.
- `uv run pytest` with `STACKFIT_PROFILE_BIN` set: 34 passed, including MCP stdio round-trip validation for `recommend_stacks` and `compare_stacks`.
