# Setup Bundles Evidence — 8 November 2026

Scope: typed deployment recipes (`recipes/recipe-a-static-node-postgres-uploads.json`, `recipes/recipe-b-docker-python-postgres-storage.json`), project-specific setup bundle synthesis (`crates/stackfit-core/src/bundle.rs`), environment variable code-reference and adapter-patch validation, lifecycle manual actions with rollback and teardown, secret scanning, CLI `bundle` subcommand, and MCP `generate_setup_bundle` tool.

## Implemented

- **Two versioned deployment recipes (`recipe_version: "2026-11-08.1"`):**
  - `recipe-a`: Cloudflare Pages (`cloudflare-pages-free`) + Render Node web service (`render-web-starter-hobby` / `render-web-starter-pro`) + Neon PostgreSQL (`neon-free` / `neon-launch`) + private Cloudflare R2 bucket (`cloudflare-r2-standard`).
  - `recipe-b`: Render Docker/Python web service (`render-web-starter-hobby` / `render-web-starter-pro`) + Neon PostgreSQL (`neon-free` / `neon-launch`) + Backblaze B2 bucket (`backblaze-b2`).
- **Five generated files per valid bundle (`status: "prepared"`):**
  1. `.env.example` — comments and `replace_with_*` placeholders only, using the project's exact variable names.
  2. `DEPLOYMENT.md` — component table, region placement, traced environment variables, ordered manual actions across `provision`, `configure`, `migrate`, `verify`, `operate` (ongoing OS patching, backup restore drill, cert/domain expiry), `rollback`, and `teardown`, plus open verification gaps.
  3. `architecture-decision.md` — workload constraints, Pareto selection vs conditional/rejected alternatives, itemized `rust_decimal` monthly cost lines with `checked_at: "2026-11-07"` and official `source_url`, excluded/unknown items, cross-service edges, and verification gaps.
  4. `provisioning-prompt.md` — exact resources/regions, price assumptions with `checked_at` and `source_url`, least-privilege permissions, validation steps, rollback, instruction to reuse existing matching resources, instruction to honor authorized scope, and explicit statement not to assume any provider MCP server is attached.
  5. `resource-manifest.json` — structured JSON manifest of resources, traced env keys, estimate summary, verification gaps, and citations.
- **Fail-closed environment key validation:**
  - Every recipe environment role resolves to the host-supplied `env_mapping` override or the recipe default key.
  - Each key must trace to a live code reference (`process.env.KEY`, `os.getenv("KEY")`, `os.environ[...]`, ignoring comments and `.env.example`) or an explicit `adapter_patches` entry (`{key, target_path, note}`).
  - Any untraced, invalid, or duplicate key marks `validation.valid = false` and emits an empty `files` list.
- **Named verification gaps (`needs_verification`) & Resolved Setup Facts:**
  - Every claim cites a curated corpus section (`corpus/sections.json`, verified `2026-11-07`) or a catalog card evidence URL (`catalog/catalog.json`, verified `2026-11-07`), or names its gap under `validation.needs_verification`.
  - **Region pairing & exact slugs verified and recorded in `catalog/catalog.json` and `recipes/*.json`:**
    - US residency pairing: Render Ohio (`ohio`) + Neon AWS US East, Ohio (`aws-us-east-2`).
    - EU residency pairing: Render Frankfurt (`frankfurt`) + Neon AWS EU Central, Frankfurt (`aws-eu-central-1`, GDPR-native EU member state; London `aws-eu-west-2` is UK-based).
  - **Backblaze B2 setup facts verified and recorded on `backblaze-b2` in `catalog/catalog.json` and `recipes/recipe-b-docker-python-postgres-storage.json`:**
    - Default bucket privacy: `Private` (`allPrivate`), versioned by default; supports only bucket-level canned ACLs (`private` and `public-read`) and rejects object-level ACL overrides with `403 Forbidden`.
    - S3 endpoint format & client region: `https://s3.<region>.backblazeb2.com` where `S3_REGION` / `AWS_REGION` is the exact 3-digit cluster segment (`us-west-004`, `us-west-000`, `us-east-005`, `eu-central-003`).
    - Application key scoping: Master Application Key is incompatible with the S3 API; requires a dedicated Application Key (`keyID` -> `S3_ACCESS_KEY_ID`, `applicationKey` -> `S3_SECRET_ACCESS_KEY`) restricted to a single bucket and optional `fileNamePrefix` with Read/Write permissions.
    - S3 operation coverage: supports `GetObject`, `PutObject`, `DeleteObject`, `HeadObject`, Multipart Uploads (`CreateMultipartUpload`, `UploadPart`, `CompleteMultipartUpload`), and AWS SigV4 presigned URLs; does not support IAM policy attachments, XML ACLs, Object Tagging, Website Hosting, or SSE-KMS (supports SSE-B2 and SSE-C).

## Citations & Checked Dates

All numeric and setup claims link to sources verified on `2026-11-07`:
- Cloudflare Pages: `https://developers.cloudflare.com/pages/configuration/build-configuration/`, `https://developers.cloudflare.com/pages/configuration/custom-domains/`, `https://developers.cloudflare.com/pages/functions/pricing/`, `https://developers.cloudflare.com/pages/platform/limits/` (`2026-11-07`)
- Render Web Services: `https://render.com/pricing`, `https://render.com/docs/outbound-bandwidth`, `https://render.com/docs/web-services`, `https://render.com/docs/docker`, `https://render.com/docs/regions`, `https://render.com/docs/health-checks`, `https://render.com/docs/configure-environment-variables`, `https://render.com/docs/node-version` (`2026-11-07`)
- Neon PostgreSQL: `https://neon.com/pricing`, `https://neon.com/docs/introduction/plans`, `https://neon.com/docs/introduction/regions`, `https://neon.com/docs/connect/connect-from-any-app`, `https://neon.com/docs/connect/connection-pooling`, `https://neon.com/docs/connect/connect-securely` (`2026-11-07`)
- Cloudflare R2: `https://developers.cloudflare.com/r2/pricing/`, `https://developers.cloudflare.com/r2/reference/data-location/`, `https://developers.cloudflare.com/r2/buckets/public-buckets/`, `https://developers.cloudflare.com/r2/buckets/cors/`, `https://developers.cloudflare.com/r2/api/s3/presigned-urls/`, `https://developers.cloudflare.com/r2/api/tokens/`, `https://developers.cloudflare.com/r2/api/s3/api/` (`2026-11-07`)
- Backblaze B2: `https://www.backblaze.com/cloud-storage/pricing`, `https://www.backblaze.com/cloud-storage/transaction-pricing`, `https://www.backblaze.com/docs/cloud-storage-data-regions`, `https://www.backblaze.com/docs/cloud-storage-s3-compatible-api` (`2026-11-07`)
