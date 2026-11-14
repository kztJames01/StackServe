# StackServe marketing site

Static Next.js homepage for StackServe. It has no backend, no auth, no analytics and no connection to the MCP server.

## Run

```sh
npm ci
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm run build
```

## Where the numbers come from

Every price, rejection, billing cliff, env-key trace and file name on the page is copied from real
`stackserve-mcp` output on repository fixtures (catalog `2026-11-11.1`, corpus `2026-11-09.1`):

| Data                            | Command                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| Profile                         | `stackserve-mcp profile fixtures/briefs/a-node-postgres-uploads.json`       |
| Retrieval chunk                 | `stackserve-mcp search "Render PORT binding"`                               |
| Recommendations, 40/32/8 counts | `stackserve-mcp recommend fixtures/workloads/node-sporadic.json`            |
| Scenarios and cliffs            | `stackserve-mcp compare fixtures/workloads/node-sporadic.json --stack <id>` |
| Commercial-use conditionals     | `stackserve-mcp recommend fixtures/workloads/node-commercial.json`          |
| Bundle, traces, checklist       | `stackserve-mcp bundle fixtures/projects/a-node-uploads.json`               |

The values live in `src/lib/data.ts`, `src/lib/demo.ts` and `src/lib/agents.ts`. When the catalog changes, rerun those commands and update both files.

## Layout

- `src/components/` — one component per homepage section (hero, how it works, proof, demo, connect, closing)
- `src/components/three/` — isolated, lazy-loaded React Three Fiber scenes (hero receipt, demo player stage). Both draw
  their paper objects as canvas textures from the fixture data; `demo-card.tsx` is the DOM version used on mobile and
  without WebGL
- `src/lib/` — typed fixture data, the hero receipt model and agent connection guides

The hero receipt (`src/lib/receipt.ts`) is built from the lowest-cost stack for `node-sporadic.json` in
`src/lib/data.ts`. It renders as a DOM element first and as a canvas texture in the 3D scene.
