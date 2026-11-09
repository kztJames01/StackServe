# E6 / S3-6b: Aikido discovery and lifecycle evidence

Checked 2026-11-09. This report records documentation review, not deployment
verification or release approval. Existing uncommitted Sprint 4 work was preserved.

## Aikido

[Official pricing](https://www.aikido.dev/pricing) advertises Developer at $0,
including two users, ten repositories, two container images, one domain and one
cloud account, with rescans every three days. The retrieved page displays Basic
at 300/month and Pro at 600/month alongside billing controls. It does not establish
the proposed automatic $350 charge when a free quota is exceeded.

`aikido-security-free` is a `security` discovery card with no price formula,
unverified commercial eligibility and explicit missing usage meters. It is not
composed into either recipe. No CI integration, credentials, external account
connection or security enforcement was added. Paid pricing, quota enforcement,
commercial rights and data residency still require verification.

## Lifecycle evidence

New sections have hashes of the fetched official Markdown bytes and their
paraphrases. Corpus, recipe and catalog snapshots are `2026-11-09.1` (recipes at
`2026-11-09.2`); existing sections retain their original dates. The corpus
contains 48 sections from 35 distinct official pages. Shared protocol fixtures
and schema versions changed together. Existing vector indexes must be rebuilt
for this corpus.

| Action | Evidence and outcome |
| --- | --- |
| DNS | [Render custom domains](https://render.com/docs/custom-domains): dashboard registration, provider-specific DNS instructions, AAAA conflict and verification. Documentation gap closed in both recipes. Account domain quotas/charges must still be checked. |
| Rollback | [Render](https://render.com/docs/rollbacks) and [Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/): retained build artifacts, successful production targets, dashboard/API autodeploy distinction and Docker digest caveat curated. Application-specific migration safety remains open. Removed unconditional reverse-migration instruction. |
| Restore | [Neon history window](https://neon.com/docs/postgres/backup-restore/history-window): Free has six hours capped at 1 GB; Launch defaults to one day, maximum seven days. The audit's claim that Free has no history is incorrect. Actual configuration, retained recovery points, drill results and history costs remain unverified; pricing formulas and backup eligibility were not changed. |
| Certificates | Render documents automatic issuance and renewal. [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) documents issuance and CAA prerequisites, and [Cloudflare certificate validity and renewal](https://developers.cloudflare.com/ssl/reference/certificate-validity-periods/) documents 90-day Universal SSL validity with automatic renewal starting 30 days before expiration. Documentation gap closed; live certificate monitoring/alerts and registrar contracts remain open. |
| Teardown | [Neon projects](https://neon.com/docs/manage/projects) (7-day recovery period; deleting projects does not stop paid-plan billing), [R2 delete buckets](https://developers.cloudflare.com/r2/buckets/delete-buckets/) (empty bucket and remove locks first), [Pages known issues](https://developers.cloudflare.com/pages/platform/known-issues/) (delete preview deployments first when >100 deployments), [Render CLI reference](https://render.com/docs/cli-reference) (`render services delete --confirm`), and Backblaze B2 [bucket management](https://www.backblaze.com/docs/cloud-storage-create-and-manage-buckets) and [application keys](https://www.backblaze.com/docs/cloud-storage-application-keys) curated. Documentation gaps closed; physical backup purge timing and final billing/retention outcomes remain open. |
| Least privilege | [Neon roles](https://neon.com/docs/manage/roles) curated. Console/API-created roles inherit neon_superuser; custom privileges require SQL-created roles and explicit grants. Both Recipe B and Recipe A guidance are approved by the owner and active (`2026-11-09.2`); project-specific grants remain unverified. |
| OS patching | [Render shared responsibility](https://render.com/docs/shared-responsibility-model) and [Docker](https://render.com/docs/docker) curated. Both Recipe B and Recipe A guidance are approved by the owner and active (`2026-11-09.2`); project-specific runtime/image patch status remains unverified. |

A documentation citation does not establish a tested deployment, restore,
successful certificate renewal or completed deletion.

## Security guidance and scoped approval

AGENTS.md says: “Agents do not self-approve. Stop for human sign-off before
changing pricing formulas, eligibility, security behavior, or release status.”
On 2026-11-09 the owner approved Recipe B and subsequently approved Recipe A as
well. Both recipes (`2026-11-09.2`) activate the database least-privilege and
OS/runtime/Docker patching text below. Existing R2 and B2 credential guidance is
preserved. Project-specific privileges and deployed runtime/image patch status
remain explicit verification gaps in the generated bundles.

- Both recipes, database least privilege: “Create a dedicated application role
  using SQL, with only the database, schema, table and sequence privileges the
  application requires. Do not use the default owner or a default console/API
  role as the application identity. Review public privileges, role memberships,
  row-level security and privileges on future objects for the actual schema.
  Keep the migration identity separate. Verify required operations succeed and
  prohibited operations fail before switching application credentials.”
- Recipe A, OS patching: “Render maintains underlying OS and supported runtime
  security. The application owner reviews application dependencies, runtime
  version constraints and deployment compatibility; record the responsible
  owner and update cadence.”
- Recipe B, OS patching: “Render maintains the host platform. The application
  owner reviews and updates the Docker base image and installed packages,
  rebuilds, tests and redeploys the image. Check build-cache behavior and pin a
  reproducible image digest; record the responsible owner and update cadence.”

This approval activates guidance; it does not grant cloud access or execute SQL.
Project-specific grants and proof of patching remain verification requirements.

## Validation

The new Aikido regression failed first because the card was absent. The card now
remains unpriced and uncomposed; attempting to place it in a recipe is rejected.
The lifecycle regression checks both bundles retain account-specific gaps while
including DNS/rollback citations and omitting unconditional reverse migrations.

Final command results (2026-11-09):

```text
cargo fmt --all -- --check
exit 0
cargo clippy --all-targets --all-features -- -D warnings
Finished `dev` profile
cargo test --all-features --workspace
test result: ok. 81 passed; 0 failed
test result: ok. 14 passed; 0 failed
test result: ok. 4 passed; 0 failed
uv sync --locked
Resolved 41 packages; Checked 17 packages
uv run ruff check .
All checks passed!
uv run ruff format --check .
12 files already formatted
STACKFIT_PROFILE_BIN=<repo>/target/debug/stackfit-mcp uv run pytest
36 passed
uv run python -m stackfit_rag.maintenance validate
44 validated sections; corpus hash c3d48e2e56559654a3f5c1e6f699c597e7e8d4d33b1df8d6a16dce1112eda4b2
```

Profile CLI emitted valid JSON; both bundle CLI examples emitted `prepared`
artifacts with `validation.valid: true`. Shared Rust/Python fixtures and MCP
round-trip/schema tests pass. The Aikido test's initial failure was
`called Option::unwrap() on a None value`; final result is `ok`.

The initial Python run rejected the stale local vector index, as intended. It
was rebuilt with `uv run --extra vector python -m stackfit_rag.maintenance
build-index`; generated index/model artifacts remain ignored. The retrieval
evaluation initially exposed overlapping Docker summaries reducing lexical
recall. Consolidating them into the existing Dockerfile section restored
lexical and hybrid Recall@5 to **1.0000**, without changing labels or ranking.
The report generator now derives the section count rather than hardcoding 36.
See [the evaluation](../evals/reports/retrieval-2026-11-09.md); its unfiltered
unsupported-query relevance limitation remains open. This is a development
evaluation, not independent proof of retrieval coverage.

Next task: review Recipe A security guidance separately, then curate the remaining
Pages renewal and non-Neon deletion/retention evidence. Aikido paid-plan modeling
needs an approved meter/eligibility specification and boundary tests first.

## Recipe A and remaining documentation gap closure validation — 2026-11-09

Focused regression before activating Recipe A and curating the remaining renewal/deletion docs:

```text
failures:
    bundle::tests::both_recipes_activate_security_guidance_and_retain_project_verification
    bundle::tests::lifecycle_evidence_closes_dns_renewal_and_deletion_docs_while_preserving_account_gaps
test result: FAILED. 80 passed; 2 failed
```

After activating Recipe A (`2026-11-09.2`) and curating the 4 renewal/deletion sections (48 total sections, corpus hash `4ec613077e47a836992b19ad34e6298aba9a9edb9f13d28a3bc79da46b7122e9`):

```text
test bundle::tests::both_recipes_activate_security_guidance_and_retain_project_verification ... ok
test bundle::tests::lifecycle_evidence_closes_dns_renewal_and_deletion_docs_while_preserving_account_gaps ... ok
cargo fmt --all -- --check: exit 0
cargo clippy --all-targets --all-features -- -D warnings: Finished dev profile
cargo test --all-features --workspace:
  test result: ok. 82 passed; 0 failed
  test result: ok. 14 passed; 0 failed
  test result: ok. 4 passed; 0 failed
uv sync --locked: Resolved 41 packages
uv run ruff check .: All checks passed!
uv run ruff format --check .: 12 files already formatted
STACKFIT_PROFILE_BIN=<repo>/target/debug/stackfit-mcp uv run pytest: 36 passed
uv run python -m stackfit_rag.maintenance validate: 48 validated sections
bundle fixtures/projects/a-node-uploads.json: recipe-a 2026-11-09.2, valid: true (6 project/account gaps)
bundle fixtures/projects/b-python-docker.json: recipe-b 2026-11-09.2, valid: true (6 project/account gaps)
```

Both recipes now have zero uncurated-documentation or pending-sign-off gaps; the remaining 6 verification items per bundle are strictly project-specific or account-level execution checks (SQL grants, runtime/image patch cadence, restore drill, certificate monitoring, registrar renewal contract, and physical backup purge / final billing verification).
