# Client distribution

Checked against official client documentation on 2026-11-14. Correction: the owner's screenshots and installed extension assets show a plugin directory UI despite the general documentation saying IDE plugins are unsupported. Do not treat that general statement as proof that this installed version lacks the directory. End-to-end installation and tool execution remain unverified. StackServe provides five MCP tools and one companion skill; it does not need a custom editor extension or embedded chat UI.

| Client | Installation surface | Source in this repository |
| --- | --- | --- |
| Codex CLI | Git marketplace plugin | `.agents/plugins/marketplace.json`, `.codex-plugin/plugin.json`, portable manifests |
| Codex VS Code extension | OpenAI directory UI observed in the owner's installed version; direct MCP also available | Public-directory submission still pending; README has direct MCP instructions |
| Cursor | Portable Agent Plugin; direct MCP also supported | `plugin.json`, `mcp.json`, `skills/stackserve/`, `.cursor/mcp.json` |
| Kilo VS Code extension | MCP marketplace entry; optional companion skill | `distribution/kilo/MCP.yaml`, `kilo.jsonc`, `skills/stackserve/` |

## Install and verify

Codex CLI:

```sh
codex plugin marketplace add kztJames01/StackServe
codex plugin add stackserve@stackserve-marketplace
```

Start a new CLI session and complete the plugin's connection flow. For Codex IDE, configure MCP separately with `codex mcp add stackserve --url https://mcp.stackserve.net/mcp` and `codex mcp login stackserve`; the CLI and IDE share MCP configuration. Do not install duplicate direct and plugin connections in the same client session.

Cursor uses the portable root manifest for skills and MCP tools. Submit the repository at <https://cursor.com/marketplace/publish> for a public listing. Until approved, direct MCP configuration in the README provides access to the tools in Cursor chat. A listing on another directory does not constitute Cursor approval.

Kilo users can merge `kilo.jsonc`'s `mcp` entry into `.kilo/kilo.json` (project) or `~/.config/kilo/kilo.json` (global) and complete OAuth. Preserve existing settings. The existing root `PLUGIN.yaml` is legacy metadata, **not a valid Kilo runtime-plugin submission**: Kilo runtime plugins require JavaScript entrypoints. Submit `distribution/kilo/MCP.yaml` as `mcps/stackserve/MCP.yaml` to <https://github.com/Kilo-Org/kilo-marketplace> instead. Use that repository's current generator and validation workflow; do not edit generated catalogs by hand.

To bundle the companion skill in Kilo, first import `skills/stackserve/` using the marketplace's remote-skill workflow and publish its archive. Only then add `skills: [stackserve]` to the MCP entry. The draft deliberately omits this reference until the archive exists. No JavaScript runtime wrapper is needed.

In each target client, test: “I have a Node app with PostgreSQL and uploads, but do not know monthly traffic. What information do you need?” Expect `profile_project`, unresolved questions, and no invented usage or complete cost. Then test documentation retrieval, recommendations, comparison, and setup generation using the synthetic fixtures. Record the client version and actual calls. Source validation is not a substitute for those client tests.

## Authentication and publication status

The public MCP endpoint responded with `invalid_token` to an unauthenticated initialize request. Public discovery returned resource `https://mcp.stackserve.net` and authorization server `https://stackserve.cloudflareaccess.com`. This verifies reachability and discovery, not successful OAuth, tool discovery, or access for arbitrary users. Complete a fresh-user sign-in test and confirm that the Access policy admits the intended audience before claiming everyone can use it. Do not distribute account tokens in plugin files.

The owner reports acceptance at codex-marketplace.com and submission at mcpmarketplace.com. Those states were not independently verified here. Cursor and Kilo submissions are separate; none was submitted by this change. Existing marketplace files and identity are preserved.

The selected OpenAI listing identity is Kaung Zaw Thant, currently free, all available countries. A public OpenAI directory submission is still a separate task: verified publisher, website/support/privacy/terms URLs, demo recording, review cases in the host, and required attestations. The owner reports no MCP IP/log storage; hosting/proxy retention and sign-in data practices have not been independently verified. No support contact has been supplied. Do not infer a hosted privacy policy from the offline server.

## Package contents

For a repository-installation ZIP, include only:

- `plugin.json`, `mcp.json`
- `.codex-plugin/plugin.json`, `.mcp.json` for Codex compatibility
- `skills/stackserve/SKILL.md`
- `assets/stackserve-light.png`, `assets/stackserve-dark.png`
- `LICENSE`, `LICENSE-MIT`, `LICENSE-APACHE`

The two PNGs are 512 × 512 conversions of the owner's supplied `frontend/public/light.jpeg` and `dark.jpeg`. Keep manifests and referenced assets together. A ZIP is not an official marketplace approval or a hosted server deployment. Codex Git marketplace installation uses the repository's marketplace index, not this standalone ZIP.

## Sources

- [Codex plugin surfaces](https://learn.chatgpt.com/docs/plugins)
- [Codex MCP configuration](https://developers.openai.com/codex/mcp)
- [Cursor plugin formats](https://cursor.com/docs/reference/plugins)
- [Cursor installation and submission](https://cursor.com/docs/plugins)
- [Kilo MCP marketplace and companion skills](https://kilo.ai/docs/customize/marketplace)
- [Kilo runtime plugin requirements](https://kilo.ai/docs/automate/extending/plugins)
- [Kilo contribution guide](https://github.com/Kilo-Org/kilo-marketplace/blob/main/CONTRIBUTING.md)

## OpenAI directory submission

The catalog shown in the owner's Codex extension is the target for public OpenAI distribution, separate from Git repository marketplaces. Reuse the hosted MCP server; no new VS Code extension or custom UI is required. Complete the listing URLs, support contact, OAuth/reviewer access, host test cases and demo recording. Then upload the completed ZIP at <https://platform.openai.com/plugins>, choose the verified publishing identity, connect the MCP, complete domain verification and scans, submit for review, and publish after approval. Follow <https://developers.openai.com/plugins/deploy/submission>. A private Plugin Creator installation is not a public directory release.
