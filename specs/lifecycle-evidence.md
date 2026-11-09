# E6 / S3-6b: Lifecycle evidence and Aikido discovery

Dependencies: E1–E5 bundle generation, versioned corpus, catalog discovery cards.

Acceptance criteria:
- Add Aikido Developer as a security discovery card without a price formula or
  an inferred commercial-use grant. Keep it outside both composed recipes.
- Record the official free allowances; do not infer an automatic paid upgrade.
- Curate official lifecycle sources with source-byte and summary hashes; bump
  the corpus version in Rust, Python, schemas, fixtures and recipes together.
- Close supported DNS and rollback documentation gaps. Narrow other gaps to
  the specific unverified claim or pending security sign-off.
- Preserve registrar, account settings, retention and billing uncertainties.
- Prepare concrete least-privilege and patching guidance for human review before
  activating security guidance, as required by AGENTS.md.

Example: generate recipe-a from fixtures/projects/a-node-uploads.json → DEPLOYMENT.md cites Render custom-domain and
rollback docs and Pages rollback docs; registrar terms remain needs_verification.
Aikido discovery → no calculated $0 total and no asserted $350 upgrade.

DoD: focused regressions, fmt, clippy, workspace tests, profile smoke, locked
Python sync, Ruff, pytest and corpus validation; source URLs, checked date and
remaining gaps recorded in reports/lifecycle-evidence.md. No release-status change.

## Recipe B security guidance activation (2026-11-09)

Owner approved Recipe B in response to the security-guidance sign-off request.
Activate the reviewed database least-privilege and Docker patching text only for
Recipe B. Preserve its B2 credential guidance and retain project-specific grant
and patch-verification gaps. Recipe A remains pending approval.

Example: `bundle fixtures/projects/b-python-docker.json` emits dedicated SQL-role
and migration-identity guidance plus host/container patch ownership, with no
pending-approval gap for those actions. Actual privilege checks and deployed
image patch verification still require evidence. Use the DoD above.
