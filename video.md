# StackServe — demo video script (CLI + MCP chat)

A screen-recorded product demo. No 3D, no motion-graphics film. Two halves:

1. **CLI workflow** — run the five tools directly in a terminal.
2. **Chat workflow** — the same five tools called by an AI coding agent over MCP.

All commands and output below were captured from `target/release/stackserve-mcp` against the repository fixtures on 13 Nov 2026. Catalog `2026-11-11.1`, corpus `2026-11-09.1`, checked `2026-11-07`.

- **Runtime:** 2:50 main cut + 1:00 social cut.
- **Format:** 16:9, 1920×1080 (record at 2560×1440 and downscale), 30fps.
- **Recording:** terminal + one editor/agent window. No talking head.
- **Terminal theme:** background `#080B12`, foreground `#F4F7FB`, prompt `#69DDF5`, success `#7AD7A8`, warning `#E8B86B`, error `#F08A8A`. Geist Mono, 18pt, 1.4 line height.

### Before you record

1. `cargo build -p stackserve-mcp --release` and `(cd python/stackserve_rag && uv sync --locked)`.
2. Run `search "Render PORT binding"` once off camera. The Python worker starts lazily; the first call is slow.
3. Capture the five CLI outputs to files and keep them open for reference. Do not re-run a command just to get a later field.
4. Clear shell history and blur the absolute path in the `opencode mcp add` line if it shows your username.
5. Use a fresh terminal with the theme above, no tabs, no notifications.

---

## Timeline

| Time | Scene | What the viewer sees |
|------|-------|----------------------|
| 0:00–0:08 | Cold open | Terminal. `--help`. Title lower-third. |
| 0:08–0:22 | Build | `cargo build -p stackserve-mcp --release` |
| 0:22–0:44 | CLI 1 · profile | Labelled requirements and open questions |
| 0:44–0:59 | CLI 2 · search | Cited provider chunks with freshness |
| 0:59–1:19 | CLI 3 · recommend | 40 candidates, 32 rejected, 2 picks |
| 1:19–1:44 | CLI 4 · compare | $10.600 → $16.600 → $24.100 and the cliff |
| 1:44–2:04 | CLI 5 · bundle | 5 files, 7 traced keys, `prepared` |
| 2:04–2:42 | Chat · MCP | Agent calls all five tools, then re-runs for commercial use |
| 2:42–2:52 | Close | Five tools, two entry points, local-first |

---

## Scene 1 — Cold open (0:00–0:08)

**Screen:** empty terminal, dark theme, cursor blinking.

```
~/stackserve $
```

Type slowly:

```sh
./target/release/stackserve-mcp --help
```

Output:

```
Usage: stackserve-mcp [OPTIONS] <COMMAND>

Commands:
  serve
  serve-http
  profile
  recommend
  compare
  bundle
  search
  help        Print this message or the help of the given subcommand(s)
```

**Lower third:** `StackServe — workload-aware cloud stack advisor`
**Sub-line:** `Rust engine · local Python retrieval · five deterministic tools`

**VO:** "This is StackServe. Five deterministic tools that turn a project into a compatible, priced cloud stack — from your terminal, or from your AI coding agent."

---

## Scene 2 — Build (0:08–0:22)

**Screen:** repository root. Cut typing time; show the command and the last lines of the build.

```sh
cargo build -p stackserve-mcp --release
```

Output (tail only):

```
   Compiling stackserve-core v0.1.0
   Compiling stackserve-mcp v0.1.0
    Finished `release` profile [optimized] target(s)
```

**Callout, bottom left:** `one binary · one local Python worker · no server to host`

**VO:** "Build one binary. Rust owns the profiling, compatibility rules, and every price calculation. A local Python worker owns retrieval. Nothing leaves the machine."

**Production note:** run `uv sync --locked` in `python/stackserve_rag` before recording. Do not show the install.

---

## Scene 3 — CLI: profile (0:22–0:44)

Type:

```sh
./target/release/stackserve-mcp profile fixtures/briefs/a-node-postgres-uploads.json
```

**Screen — show the top of the JSON, then jump to two specific blocks.** Use a highlight box on `storage_gb` and `uploads`.

```json
{
  "name": "Fixture A: commercial Node app",
  "requirements": [
    { "field": "runtime", "value": "node", "label": "constraint", "defaulted": false },
    { "field": "traffic", "value": "sporadic", "label": "constraint", "defaulted": false },
    { "field": "database", "value": "postgresql", "label": "constraint", "defaulted": false },
    { "field": "storage_gb", "value": null, "label": "assumption", "defaulted": true },
    …
    { "field": "framework_reference", "value": "express", "label": "evidence",
      "evidence": { "path": "package.json", "line_start": 1, "confidence": "medium" } },
    { "field": "uploads", "value": "possible", "label": "inference",
      "evidence": { "path": "src/uploads.js", "line_start": 1, "confidence": "medium" } }
  ],
  "questions": [
    "How many GB of storage will the application use per month?",
    "How many GB will be delivered or egressed per month?",
    "How many requests per month should be assumed?",
    "Which region or data-residency requirement applies?",
    …
  ],
  "needs_verification": true
}
```

**Callout sequence (one at a time):**
- `evidence` → came from a file and a line
- `inference` → probable, not proven
- `constraint` → you stated it
- `assumption` → defaulted, still unknown

**VO:** "Profile first. Seventeen requirements, each labelled. `express` in package.json is evidence. Uploads in `src/uploads.js` is an inference. Storage and egress are still unknown — and they come back as questions, not silent zeros. The brief says this is commercial. Hold that thought — it changes the answer later."

**Production note:** the profile brief declares `commercial_use: true`, while `fixtures/workloads/node-sporadic.json` (used for ranking in Scenes 5–6) is the non-commercial run. Scene 8d pays this off. Do not hide the difference; say it.

**Accuracy note:** the count is 17 requirements and 8 questions on this fixture. Do not round or say "twenty".

---

## Scene 4 — CLI: search (0:44–0:59)

Type:

```sh
./target/release/stackserve-mcp search "Render PORT binding"
```

Output (trimmed):

```json
{
  "status": "ok",
  "retrieval_mode": "lexical",
  "corpus_version": "2026-11-09.1",
  "chunks": [
    {
      "id": "render-web-port",
      "heading": "Port binding",
      "source_url": "https://render.com/docs/web-services",
      "verified_at": "2026-11-07",
      "freshness": "fresh"
    },
    …
  ]
}
```

**Callout:** draw a line from `source_url` to `verified_at` to `freshness`.
**Badge, top right of frame:** `8 chunks · local corpus · no network call`

**VO:** "Retrieval runs against a pinned local corpus. Every chunk keeps its source URL, the date it was verified, and its freshness. Eight chunks come back. No recommendation-time network call."

**Production note:** run one search off camera first. The worker starts lazily and the first call can take several seconds.

---

## Scene 5 — CLI: recommend (0:59–1:19)

Type:

```sh
./target/release/stackserve-mcp recommend fixtures/workloads/node-sporadic.json
```

**Screen — do not show all 25 KB.** Show this reduced view with `jq`, or pre-render it as a clean panel:

```sh
./target/release/stackserve-mcp recommend fixtures/workloads/node-sporadic.json > /tmp/rec.json
jq '{candidates: ((.comparison | length) + (.rejected | length)),
     feasible: (.comparison | length),
     selections: [.selections[] | {stack_id, roles, total: .estimate.total_known}],
     rejected: (.rejected | length)}' /tmp/rec.json
```

Output:

```json
{
  "candidates": 40,
  "feasible": 8,
  "selections": [
    {
      "stack_id": "recipe-a/…+neon-free+cloudflare-r2-standard",
      "roles": ["lowest_cost", "balanced"],
      "total": { "usd": "10.600" }
    },
    {
      "stack_id": "recipe-a/…+neon-launch+cloudflare-r2-standard",
      "roles": ["performance"],
      "total": { "usd": "17.135" }
    }
  ],
  "rejected": 32
}
```

**Callout, left:** `40 candidates → 32 rejected → 8 feasible → 2 selected`
**Callout, right:** `$10.600 lowest cost · $17.135 performance`

Then show one rejection reason. Reuse the captured file — do not invoke the tool twice:

```sh
jq '.rejected[0]' /tmp/rec.json
```

```json
{
  "stack_id": "recipe-b/render-web-starter-hobby+neon-free+cloudflare-r2-standard",
  "findings": [
    {
      "filter": "runtime",
      "code": "unsupported_runtime",
      "detail": "recipe recipe-b does not support Node"
    }
  ]
}
```

*Trimmed: the real entry also carries `"card_id": null`.*

**VO:** "Forty candidate stacks. Thirty-two are rejected before anything is ranked — here, a Python recipe that does not support Node. Eight survive. Two get selected: a lowest-cost pick at ten dollars sixty a month, and a performance pick at seventeen thirteen five. The reason is attached, not scored."

**On-screen typo guard:** format the price as `$10.600`, matching the tool. Do not render `$10.60`.

---

## Scene 6 — CLI: compare (1:19–1:44)

Type:

```sh
./target/release/stackserve-mcp compare fixtures/workloads/node-sporadic.json \
  --stack "recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-free+cloudflare-r2-standard" \
  --stack "recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-launch+cloudflare-r2-standard" \
  | jq '[.stacks[] | {stack: (.stack_id | split("/")[1]),
        scenarios: [.scenarios[] | {scenario, total: .estimate.total_known.usd,
                    rejected: [.rejected[]? | {code, detail}]}]}]'
```

Output:

```json
[
  {
    "stack": "…+neon-free+cloudflare-r2-standard",
    "scenarios": [
      { "scenario": "now", "total": "10.600", "rejected": [] },
      { "scenario": "three_x_traffic", "total": "16.600",
        "rejected": [{ "code": "quota_exceeded",
                       "detail": "DbCuHours 180 exceeds the plan limit 100" }] },
      { "scenario": "ten_x_storage_egress", "total": "24.100",
        "rejected": [{ "code": "quota_exceeded",
                       "detail": "DbGb 5.0 exceeds the plan limit 1" }] }
    ]
  },
  {
    "stack": "…+neon-launch+cloudflare-r2-standard",
    "scenarios": [
      { "scenario": "now", "total": "17.135", "rejected": [] },
      { "scenario": "three_x_traffic", "total": "35.855", "rejected": [] },
      { "scenario": "ten_x_storage_egress", "total": "32.210", "rejected": [] }
    ]
  }
]
```

**On-screen graphic:** three columns — `now`, `3× traffic`, `10× storage`. Under the free stack, strike through `$16.600` and `$24.100` in coral with a `✕`. Under the performance stack, keep all three totals.

**Callout:** `The $0 database is rejected at 3× and 10×. That is the billing cliff.`

**VO:** "Growth is where the cheap answer breaks. At three-times traffic the free database needs a hundred and eighty CU-hours against a hundred-hour limit. At ten-times storage it needs five gigabytes against a one-gigabyte limit. The performance stack stays feasible across all three scenarios — and costs more. Both facts are on screen."

---

## Scene 7 — CLI: bundle (1:44–2:04)

Type:

```sh
./target/release/stackserve-mcp bundle fixtures/projects/a-node-uploads.json
```

**Screen:** show the header, then jump to validation. Use a reduced `jq` view:

```sh
./target/release/stackserve-mcp bundle fixtures/projects/a-node-uploads.json \
  | jq '{status, files: [.files[].path],
         validation: {valid: .validation.valid,
                      secret_scan_clean: .validation.secret_scan_clean,
                      traced_keys: [.validation.traced_keys[] | {key, trace}]}}'
```

Output:

```json
{
  "status": "prepared",
  "files": [
    ".env.example",
    "DEPLOYMENT.md",
    "architecture-decision.md",
    "provisioning-prompt.md",
    "resource-manifest.json"
  ],
  "validation": {
    "valid": true,
    "secret_scan_clean": true,
    "traced_keys": [
      { "key": "PG_URL", "trace": { "kind": "code_reference", "path": "src/db.js", "line": 2 } },
      { "key": "R2_S3_ENDPOINT", "trace": { "kind": "code_reference", "path": "src/storage.js", "line": 2 } },
      { "key": "UPLOADS_BUCKET", "trace": { "kind": "code_reference", "path": "src/storage.js", "line": 4 } },
      { "key": "FRONTEND_ORIGIN", "trace": { "kind": "code_reference", "path": "src/server.js", "line": 1 } },
      …
    ]
  }
}
```

**Callout:** animate the trace `PG_URL → src/db.js:2`.
**Badge:** `status: prepared — not deployed`

**VO:** "The bundle is five files, and every environment key traces to a line of your code. `PG_URL` exists because `src/db.js` line two reads it. Validation passes, the secret scan is clean, and the status is `prepared`. StackServe does not create resources."

**Do not show:** the full `.env.example` if it would invite a pause. If you do, keep the `replace_with_…` placeholders visible.

---

## Scene 8 — Chat: the same five tools over MCP (2:04–2:42)

Switch to the editor with the agent panel. Use **OpenCode** — it is the host with a recorded five-tool smoke test in this repo. The same server works in Cursor, Codex, and Claude Code.

### 8a. Register the server (2:04–2:10)

Terminal:

```sh
opencode mcp add stackserve -- "$PWD/target/release/stackserve-mcp" serve
opencode mcp list
```

```console
✓ stackserve  connected
```

**Callout:** `stdio · no port · the agent starts the server`

**Production note:** in the recorded smoke test, the server did not appear on the first `mcp list` immediately after `mcp add`; the next invocation showed it connected. If that happens, cut it — do not fake the checkmark.

### 8b. The chat prompt (2:10–2:14)

Type this into the agent chat:

```text
Use the StackServe MCP server and the repository fixtures.

1. Profile fixtures/briefs/a-node-postgres-uploads.json.
2. Check the docs for Render's port binding.
3. Using fixtures/workloads/node-sporadic.json
   (2M requests/month, 100 GB stored, 1 TB egress,
   20 GB app outbound, 0.5 GB database, 60 CU-hours),
   recommend a stack.
4. Compare the lowest-cost and performance picks at 3× traffic
   and 10× storage.
5. Prepare a setup bundle from fixtures/projects/a-node-uploads.json
   for the lowest-cost stack.

Use only values the tools return. Do not invent prices.
Show me the file list before writing anything.
```

**Accuracy note:** MCP tools are invoked by the model from the prompt — there is no `/tool` slash command. Do not stage a fake one. Show the host's real tool-call rows as they appear.

### 8c. Tool-call rail (2:14–2:30)

Show the agent's tool calls firing in order. Do not fake a streaming animation — capture the real run and speed-ramp it.

| # | Tool | Result line on screen |
|---|------|------------------------|
| 1 | `profile_project` | `17 requirements · 8 questions · needs_verification: true` |
| 2 | `search_provider_docs` | `status: ok · lexical · 8 chunks · source + verified_at` |
| 3 | `recommend_stacks` | `2 selections · $10.600 · $17.135 · 32 rejected` |
| 4 | `compare_stacks` | `2 stacks × 3 scenarios · 2 billing cliffs` |
| 5 | `generate_setup_bundle` | `status: prepared · 5 files · 7 traced keys` |

**Split-screen beat:** left = the chat prompt, right = the JSON tool result. Zoom into `"total": { "usd": "10.600" }` as it appears.

**VO:** "The same five tools, called by the agent instead of by hand. The agent is the conversation. StackServe is the engine. Every number on screen came out of a tool result — not out of the model."

### 8d. The guardrail beat (2:30–2:38)

Follow-up in chat:

```text
What changes if this ships as a commercial product?
```

The agent re-runs `recommend_stacks` with `commercial_use: true`.

Screen — reduced view (not raw output):

```sh
… recommend /tmp/node-commercial.json \
  | jq '{selections: (.selections|length), conditional: (.conditional|length),
         rejected: (.rejected|length)}'
```

```json
{
  "selections": 0,
  "conditional": 8,
  "rejected": 32
}
```

Then the first condition (`.conditional[0].conditions[0]`), trimmed to two fields:

```json
{
  "code": "commercial_use_unverified",
  "detail": "commercial use is not confirmed for this plan"
}
```

**Callout:** `0 confident picks. 8 conditional. Fail closed.`

**VO:** "Ask what changes for commercial use, and the answer changes honestly. Zero confident picks. Eight conditional stacks, each with the reason. The tool would rather return a conditional result than a false total."

**Accuracy note:** the conditional count is 8 on this fixture. Do not say "most" or "all". Do not show a dollar total for a conditional stack.

### 8e. Human review (2:38–2:42)

Show the diff view and the `prepared` status. Do not accept the edit on camera.

**VO:** "Nothing is written until you approve it. The agent shows the bundle; you review the diff."

---

## Scene 9 — Close (2:42–2:52)

**Screen:** terminal split with the five tool names and two entry points.

```
profile_project → search_provider_docs → recommend_stacks
→ compare_stacks → generate_setup_bundle

CLI:  stackserve-mcp <tool>
MCP:  stackserve-mcp serve
```

**End card:**

> **StackServe**
> Local-first · Evidence-backed · Human-controlled
> `github.com/kztJames01/Stackfit`

**VO:** "Five deterministic tools. Two ways to run them. Your terminal, or your agent. Local-first, evidence-backed, and always reviewable."

---

## Voiceover script (clean read)

> This is StackServe. Five deterministic tools that turn a project into a compatible, priced cloud stack — from your terminal, or from your AI coding agent.
>
> Build one binary. Rust owns the profiling, compatibility rules, and every price calculation. A local Python worker owns retrieval. Nothing leaves the machine.
>
> Profile first. Seventeen requirements, each labelled. Express in package.json is evidence. Uploads in `src/uploads.js` is an inference. Storage and egress are still unknown — and they come back as questions, not silent zeros.
>
> Retrieval runs against a pinned local corpus. Every chunk keeps its source URL, the date it was verified, and its freshness. Eight chunks come back. No recommendation-time network call.
>
> Forty candidate stacks. Thirty-two are rejected before anything is ranked — here, a Python recipe that does not support Node. Eight survive. Two get selected: a lowest-cost pick at ten dollars sixty a month, and a performance pick at seventeen thirteen five. The reason is attached, not scored.
>
> Growth is where the cheap answer breaks. At three-times traffic the free database needs a hundred and eighty CU-hours against a hundred-hour limit. At ten-times storage it needs five gigabytes against a one-gigabyte limit. The performance stack stays feasible across all three scenarios — and costs more. Both facts are on screen.
>
> The bundle is five files, and every environment key traces to a line of your code. `PG_URL` exists because `src/db.js` line two reads it. Validation passes, the secret scan is clean, and the status is `prepared`. StackServe does not create resources.
>
> The same five tools, called by the agent instead of by hand. The agent is the conversation. StackServe is the engine. Every number on screen came out of a tool result — not out of the model.
>
> Ask what changes for commercial use, and the answer changes honestly. Zero confident picks. Eight conditional stacks, each with the reason. The tool would rather return a conditional result than a false total.
>
> Nothing is written until you approve it. The agent shows the bundle; you review the diff.
>
> Five deterministic tools. Two ways to run them. Your terminal, or your agent. Local-first, evidence-backed, and always reviewable.

Runtime at a calm pace: about 2:35. Trim the retrieval or bundle paragraph for the 2:30 cut.

---

## 60-second cut

| Time | Beat | Source scene |
|------|------|--------------|
| 0:00–0:06 | `--help` + title | Scene 1 |
| 0:06–0:16 | profile: unknown stays unknown | Scene 3 |
| 0:16–0:28 | recommend: 40 → 32 rejected → 2 picks | Scene 5 |
| 0:28–0:38 | compare: the 3× cliff | Scene 6 |
| 0:38–0:46 | bundle: `PG_URL → src/db.js:2`, prepared | Scene 7 |
| 0:46–0:55 | chat: five tools, then commercial → conditional | Scene 8 |
| 0:55–1:00 | end card | Scene 9 |

No VO required; use captions + music.

---

## Editing notes

- **Typing:** type commands at 1×, then speed-ramp output to 1.5–2×. Cut dead frames only, not mid-line.
- **Zoom:** use 1.25–1.5× punch-ins on the exact line being narrated. Keep the terminal font legible at 1080p — never below 14px on screen.
- **Highlights:** cyan box for evidence/trace, amber for unknown/conditional, coral for rejection. Same tokens as the website.
- **Cuts:** no wipe transitions. Hard cuts between tool runs.
- **Captions:** burn in the tool name and one-line result for each CLI scene. Add an SRT.
- **Cursor:** use a large, high-contrast cursor; hide the real mouse when typing.
- **Secrets:** only fixture data and `replace_with_…` placeholders. Blur any absolute home path in the `opencode mcp add` line if preferred.
- **Do not show:** the 25 KB recommend payload, the 80 KB bundle payload, the full `.env.example`, or a provisioning/deploy action.

---

## Accuracy guardrails

- Show `$10.600`, `$17.135`, `$16.600`, `$24.100`, `$35.855`, `$32.210` exactly as the tool prints them. They are **known monthly totals**, not invoices.
- Say **"17 requirements, 8 questions"**, **"40 candidates, 32 rejected, 8 feasible"**, **"5 files, 7 traced keys"**. Do not approximate.
- The run is against **repository fixtures**, not a customer project. If a frame implies otherwise, label it.
- Do not imply that `recommend_stacks` measures performance. The performance role means no component that always sleeps, not a latency benchmark.
- Do not imply that StackServe provisions, deploys, holds credentials, or calls provider APIs at recommendation time.
- `prepared` is the furthest state StackServe can reach. `configured` and `deployment verified` belong to the user.
