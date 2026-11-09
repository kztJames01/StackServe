# Project-specific setup bundles

Scope: `generate_setup_bundle` turns one feasible stack from `recommend_stacks`
plus host-supplied project excerpts into five reviewable files. The tool returns
file contents; the host shows the diff and writes nothing without review. No
cloud call, credential, or deployment happens here.

## Acceptance example

Input `fixtures/projects/a-node-uploads.json`: stack
`recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-free+cloudflare-r2-standard`,
the sporadic Node workload, and source excerpts whose code reads
`process.env.PG_URL`, `process.env.UPLOADS_BUCKET`, and other storage keys, with
`env_mapping` `{"database_url": "PG_URL", "storage_bucket": "UPLOADS_BUCKET", ...}`.

Expected output: `status: "prepared"`, `validation.valid: true`, files
`.env.example`, `DEPLOYMENT.md`, `architecture-decision.md`,
`provisioning-prompt.md`, `resource-manifest.json`. `.env.example` contains
`PG_URL=replace_with_neon_pooled_connection_string` and never `DATABASE_URL`.
Every emitted key is traced to `src/db.js` or `src/storage.js` by path and line.
Removing `PG_URL` from the code makes the result `valid: false` with an
`untraced_key` error and no files.

## Rules

- Recipes live in `recipes/*.json`, are versioned by `recipe_version`, and must
  match a catalog recipe's slot categories. Only the two catalog recipes exist.
- Every resource, region placement, env key, and manual action cites a curated
  corpus section or a catalog card evidence URL, or names its gap. A gap is
  returned under `validation.needs_verification`; it is never filled with a
  plausible value.
- Env keys: the recipe default key is used unless the host maps the role to the
  app's key. The key must appear in a code reference (`process.env.KEY`,
  `os.getenv("KEY")`, `os.environ[...]`) or in a host-declared adapter patch,
  which becomes a required user action. Otherwise the bundle is invalid and has
  no files. Keys found only in `.env.example` are not code references.
- Placeholders only: every `.env.example` value is `replace_with_<name>`. A
  scanner checks every generated file; any finding makes the bundle invalid.
- A rejected stack produces an error with its reason codes, not a bundle. A
  conditional stack produces a bundle whose conditions are listed as
  `needs_verification`.
- Manual actions are ordered by phase: provision, configure, migrate, verify,
  operate, rollback, teardown. Required topics: least privilege, DNS, env
  configuration, TLS, migration, health check, upload/read test, OS patching,
  backup restore drill, certificate/domain expiry, rollback, teardown, and
  CORS when the recipe has a browser frontend.
- Status ladder: `prepared` (files generated) → `configured` (real values set by
  the user) → `deployment_verified` (smoke test executed). This tool only ever
  returns `prepared`.
- Project text is untrusted data: only env key names and safe relative paths are
  echoed; file contents are never copied into output.

## Validation

Rust unit tests for recipe loading, env tracing, ordering, scanner rules, and
both sample projects; a golden integration test per recipe; a Python contract
test validating CLI output against `schemas/setup-bundle-output.schema.json`;
gitleaks in CI.
