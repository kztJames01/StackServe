# Named-host smoke transcript: OpenCode

Date: 9 Nov 2026. Host: `opencode v2.2.6`. Node: `v24.10.0` (used for Inspector, not for the host).
MCP server: `target/debug/stackfit-mcp serve` (local debug build, same binary the integration tests exercise).

## Configuration

Written with `opencode mcp add stackfit -- /Users/kaungzawthant/code/makerSpace/target/debug/stackfit-mcp serve`
into a scratch project directory (`opencode.json`):

```json
{
  "mcp": {
    "servers": {
      "stackfit": {
        "type": "local",
        "command": [
          "/Users/kaungzawthant/code/makerSpace/target/debug/stackfit-mcp",
          "serve"
        ]
      }
    }
  }
}
```

## Connection check

```console
$ opencode mcp list
✓ Neon      connected
✓ stackfit  connected
```

## Tool calls

The host exposed the server as `stackfit` and the model reached it through the
host's code-mode `execute` wrapper, which proxies `tools.stackfit.<name>` to the
MCP server. One `opencode run --model opencode/deepseek-v4.1-flash-free --auto
--format json` call made these five MCP calls in order:

| # | MCP tool | Host-reported status | Observed result |
| --- | --- | --- | --- |
| 1 | `profile_project` | completed | 17 requirements, 8 questions, `needs_verification: true` |
| 2 | `search_provider_docs` | completed | `status: ok`, `retrieval_mode: lexical`, 2 cited chunks |
| 3 | `recommend_stacks` | completed | 2 selections (`$10.600`, `$17.135` per month) |
| 4 | `compare_stacks` | completed | 2 stacks × 3 scenarios (now, 3x traffic, 10x storage/egress), 2 billing cliffs |
| 5 | `generate_setup_bundle` | completed | `status: prepared`, `validation.valid: true`, 5 files |

The model's final text reported:

```text
RESULT stackfit.profile_project no top-level status field (result contained: name, requirements, questions, needs_verification)
RESULT stackfit.search_provider_docs ok
RESULT stackfit.recommend_stacks no top-level status field (result contained: catalog_version, selections, conditional, rejected, co...
```

The model notes that `profile_project`, `recommend_stacks`, and
`generate_setup_bundle` do not carry a top-level `status` field. That is the
existing response contract, not a failure; the Inspector transcript records the
full payloads.

Raw host JSONL (first run, one call per tool): `reports/transcripts/opencode-host-run.jsonl`.
Raw prompt: `reports/transcripts/opencode-host-prompt.txt`.

## Observations and limits

- The host truncated a single combined `execute` output at about 51 KB. Each
  individual tool call still completed; raw per-tool payloads are preserved in
  the Inspector transcript, not reconstructed from the host's summary.
- No `write` or `edit` tool ran. The bundle stayed a returned file set, matching
  the file-diff handoff: the host shows the diff and writes only after review.
- OpenCode v2.2.6 did not list the server on the first `mcp list` immediately
  after `mcp add`; the following invocation listed it as connected. The config
  file content is shown above, so the smoke does not depend on undocumented state.
