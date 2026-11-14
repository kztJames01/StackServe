export const CHAPTER_SECONDS = 7;

export type DemoChapter = {
  id: string;
  title: string;
  caption: string;
  command: string;
  output: string[];
};

export const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: "profile",
    title: "Profile the project",
    caption: "Project files become labelled requirements. Unknown usage stays unknown, and comes back as questions.",
    command: "stackserve-mcp profile fixtures/briefs/a-node-postgres-uploads.json",
    output: [
      '{ "name": "Fixture A: commercial Node app",',
      '  "requirements": [',
      '    { "field": "runtime", "value": "node", "label": "constraint" },',
      '    { "field": "storage_gb", "value": null, "label": "assumption", "defaulted": true },',
      '    { "field": "uploads", "value": "possible", "label": "inference",',
      '      "evidence": { "path": "src/uploads.js", "line_start": 1 } },',
      "    …],",
      '  "questions": ["How many GB of storage will the application use per month?", …],',
      '  "needs_verification": true }',
    ],
  },
  {
    id: "retrieve",
    title: "Retrieve provider documentation",
    caption: "A local, pinned corpus is searched. Each chunk keeps its source URL, verified date and freshness.",
    command: 'stackserve-mcp search "Render PORT binding"',
    output: [
      '{ "corpus_version": "2026-11-09.1",',
      '  "status": "ok",',
      '  "retrieval_mode": "lexical",',
      '  "chunks": [{',
      '    "id": "render-web-port", "heading": "Port binding",',
      '    "source_url": "https://render.com/docs/web-services",',
      '    "verified_at": "2026-11-07", "freshness": "fresh" }, …] }',
    ],
  },
  {
    id: "recommend",
    title: "Evaluate compatibility",
    caption: "40 candidate stacks. 32 rejected by rules before ranking. 8 feasible stacks are ranked.",
    command: "stackserve-mcp recommend fixtures/workloads/node-sporadic.json",
    output: [
      '"selections": [',
      '  { "stack_id": "recipe-a/…+neon-free+cloudflare-r2-standard",',
      '    "roles": ["lowest_cost", "balanced"], "total_known": { "usd": "10.600" } },',
      '  { "stack_id": "recipe-a/…+neon-launch+cloudflare-r2-standard",',
      '    "roles": ["performance"], "total_known": { "usd": "17.135" } }],',
      '"rejected": [ 32 stacks · "code": "unsupported_runtime", … ]',
    ],
  },
  {
    id: "compare",
    title: "Compare costs across scenarios",
    caption:
      "The $0 database is rejected at 3× traffic and at 10× storage. That is a billing cliff, found before you hit it.",
    command: 'stackserve-mcp compare fixtures/workloads/node-sporadic.json --stack "recipe-a/…neon-free…"',
    output: [
      '"cliffs": [',
      '  { "card_id": "neon-free", "kind": "plan_limit", "meter": "db_cu_hours",',
      '    "threshold": "100", "first_exceeded_in": "three_x_traffic" },',
      '  { "card_id": "neon-free", "kind": "plan_limit", "meter": "db_gb",',
      '    "threshold": "1", "first_exceeded_in": "ten_x_storage_egress" }]',
    ],
  },
  {
    id: "bundle",
    title: "Prepare the setup bundle",
    caption: "Five reviewable files. Every env key is traced to a line in your code.",
    command: "stackserve-mcp bundle fixtures/projects/a-node-uploads.json",
    output: [
      '"status": "prepared",',
      '"files": [".env.example", "DEPLOYMENT.md", "architecture-decision.md",',
      '          "provisioning-prompt.md", "resource-manifest.json"],',
      '"validation": { "valid": true, "secret_scan_clean": true,',
      '  "traced_keys": [{ "key": "PG_URL",',
      '    "trace": { "path": "src/db.js", "line": 2 } }, …] }',
    ],
  },
];

export const DEMO_TOTAL = DEMO_CHAPTERS.length * CHAPTER_SECONDS;
