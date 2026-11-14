export const CATALOG_VERSION = "2026-11-11.1";
export const CORPUS_VERSION = "2026-11-09.1";
export const CHECKED_AT = "2026-11-07";
export const REPO_URL = "https://github.com/kztJames01/StackServe";

export type ToolName =
  "profile_project" | "search_provider_docs" | "recommend_stacks" | "compare_stacks" | "generate_setup_bundle";

export type Step = {
  id: string;
  index: string;
  tool: ToolName;
  verb: string;
  line: string;
};

export const STEPS: Step[] = [
  {
    id: "profile",
    index: "01",
    tool: "profile_project",
    verb: "Profile",
    line: "Reads your project and labels every requirement. Unknowns stay unknown.",
  },
  {
    id: "retrieve",
    index: "02",
    tool: "search_provider_docs",
    verb: "Retrieve",
    line: "Searches pinned provider docs. Every fact keeps its source and checked date.",
  },
  {
    id: "recommend",
    index: "03",
    tool: "recommend_stacks",
    verb: "Reject",
    line: "Drops stacks that fail runtime, quota, region or commercial-use rules before ranking.",
  },
  {
    id: "compare",
    index: "04",
    tool: "compare_stacks",
    verb: "Compare",
    line: "Prices every line item in exact decimals and replays growth to find billing cliffs.",
  },
  {
    id: "bundle",
    index: "05",
    tool: "generate_setup_bundle",
    verb: "Prepare",
    line: "Writes setup files you review. Every env key is traced to a line in your code.",
  },
];

export type RequirementLabel = "evidence" | "inference" | "constraint" | "assumption";

export type Requirement = {
  field: string;
  value: string | null;
  label: RequirementLabel;
  source?: string;
};

export const PROFILE_REQUIREMENTS: Requirement[] = [
  { field: "runtime", value: "node", label: "constraint" },
  { field: "database", value: "postgresql", label: "constraint" },
  { field: "traffic", value: "sporadic", label: "constraint" },
  { field: "commercial_use", value: "true", label: "constraint" },
  { field: "framework_reference", value: "express", label: "evidence", source: "package.json:1" },
  { field: "database_driver", value: "pg", label: "evidence", source: "package.json:1" },
  { field: "uploads", value: "possible", label: "inference", source: "src/uploads.js:1" },
  { field: "storage_gb", value: null, label: "assumption" },
  { field: "egress_gb", value: null, label: "assumption" },
  { field: "region", value: null, label: "assumption" },
  { field: "availability", value: null, label: "assumption" },
  { field: "budget_usd", value: null, label: "assumption" },
];

export const PROFILE_QUESTIONS = [
  "How many GB of storage will the application use per month?",
  "How many GB will be delivered or egressed per month?",
  "Which region or data-residency requirement applies?",
  "What monthly budget cap applies in USD?",
];

export type DependencyVersion = {
  name: string;
  version: string;
  source: string;
};

export const PROFILE_DEPENDENCIES: DependencyVersion[] = [
  { name: "express", version: "4.21.2", source: "package.json:1" },
  { name: "pg", version: "8.13.1", source: "package.json:1" },
];

export type DocChunk = {
  id: string;
  provider: string;
  heading: string;
  text: string;
  sourceUrl: string;
  documentType: string;
  verifiedAt: string;
  freshness: "fresh";
};

export const DOC_CHUNKS: DocChunk[] = [
  {
    id: "render-web-port",
    provider: "render",
    heading: "Port binding",
    text: "Render web services must listen on 0.0.0.0. Bind the public HTTP server to PORT; its default is 10000.",
    sourceUrl: "https://render.com/docs/web-services",
    documentType: "setup",
    verifiedAt: CHECKED_AT,
    freshness: "fresh",
  },
  {
    id: "neon-connect-port",
    provider: "neon",
    heading: "What port does Neon use?",
    text: "Neon PostgreSQL connections use port 5432. Application clients connect using the connection details supplied by the console.",
    sourceUrl: "https://neon.com/docs/connect/connect-from-any-app",
    documentType: "setup",
    verifiedAt: CHECKED_AT,
    freshness: "fresh",
  },
  {
    id: "card:cloudflare-r2-standard",
    provider: "cloudflare",
    heading: "R2 pricing",
    text: "Standard: $0.015/GB-month; free 10 GB-month, 1M Class A, 10M Class B; egress free.",
    sourceUrl: "https://developers.cloudflare.com/r2/pricing/",
    documentType: "pricing",
    verifiedAt: CHECKED_AT,
    freshness: "fresh",
  },
  {
    id: "card:neon-free",
    provider: "neon",
    heading: "Neon plans",
    text: "Free: 100 CU-hours per project, 1 GB storage per project, compute scales to zero after 5 minutes.",
    sourceUrl: "https://neon.com/docs/introduction/plans",
    documentType: "pricing",
    verifiedAt: CHECKED_AT,
    freshness: "fresh",
  },
];

export type Verdict = "pass" | "conditional" | "reject";

export type CompatCheck = {
  dimension: string;
  subject: string;
  verdict: Verdict;
  detail: string;
};

export const COMPAT_CHECKS: CompatCheck[] = [
  {
    dimension: "Runtime",
    subject: "recipe-a · Render native Node.js",
    verdict: "pass",
    detail: "Node supported by the recipe and the runtime card.",
  },
  {
    dimension: "Runtime",
    subject: "recipe-c · Hetzner / Scaleway VPS",
    verdict: "reject",
    detail: "unsupported_runtime — recipe recipe-c does not support Node.",
  },
  {
    dimension: "Runtime",
    subject: "scaleway-dev1-s",
    verdict: "reject",
    detail: "unsupported_runtime — Node is not a verified runtime.",
  },
  {
    dimension: "Quota",
    subject: "neon-free at 3× traffic",
    verdict: "reject",
    detail: "quota_exceeded — DbCuHours 180 exceeds the plan limit 100.",
  },
  {
    dimension: "Commercial use",
    subject: "neon-free for a commercial app",
    verdict: "conditional",
    detail: "commercial_use_unverified — commercial use is not confirmed for this plan.",
  },
  {
    dimension: "Quota",
    subject: "neon-free with no db_gb given",
    verdict: "conditional",
    detail: "quota_unknown — DbGb not provided; plan limit is 1.",
  },
  {
    dimension: "Sleep",
    subject: "neon-launch (performance pick)",
    verdict: "pass",
    detail: "No component that always sleeps when idle.",
  },
];

export const RECOMMEND_COUNTS = {
  candidates: 40,
  feasible: 8,
  rejected: 32,
} as const;

export type LineItem = {
  provider: string;
  label: string;
  short: string;
  units: string;
  unit: string;
  amount: string;
  allowance?: string;
};

export type ScenarioId = "now" | "three_x_traffic" | "ten_x_storage_egress";

export type Scenario = {
  id: ScenarioId;
  label: string;
  lines: LineItem[];
  total: string;
  rejection?: string;
};

export type ComparedStack = {
  id: string;
  name: string;
  role: string;
  scenarios: Scenario[];
};

const pagesLine: LineItem = {
  provider: "Cloudflare",
  label: "Pages · static hosting",
  short: "Pages",
  units: "1",
  unit: "month",
  amount: "0",
};
const renderInstance: LineItem = {
  provider: "Render",
  label: "Starter instance",
  short: "Render Starter",
  units: "1",
  unit: "month",
  amount: "7",
};
const classOps: LineItem = {
  provider: "Cloudflare",
  label: "R2 Class A + B operations",
  short: "R2 ops",
  units: "0",
  unit: "M requests",
  amount: "0",
  allowance: "inside 1M A / 10M B free",
};

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  now: "Current workload",
  three_x_traffic: "3× traffic",
  ten_x_storage_egress: "10× storage / egress",
};

export const COMPARED_STACKS: ComparedStack[] = [
  {
    id: "recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-free+cloudflare-r2-standard",
    name: "Pages · Render Starter · Neon Free · R2",
    role: "Lowest cost · Balanced",
    scenarios: [
      {
        id: "now",
        label: SCENARIO_LABELS.now,
        total: "10.600",
        lines: [
          pagesLine,
          renderInstance,
          {
            provider: "Render",
            label: "Outbound bandwidth",
            short: "Outbound",
            units: "15",
            unit: "GB",
            amount: "2.25",
            allowance: "5 GB included",
          },
          { provider: "Neon", label: "Free plan", short: "Neon Free", units: "1", unit: "month", amount: "0" },
          {
            provider: "Cloudflare",
            label: "R2 standard storage",
            short: "R2 storage",
            units: "90",
            unit: "GB-month",
            amount: "1.350",
            allowance: "10 GB-month free",
          },
          classOps,
        ],
      },
      {
        id: "three_x_traffic",
        label: SCENARIO_LABELS.three_x_traffic,
        total: "16.600",
        rejection: "neon-free · quota_exceeded — DbCuHours 180 exceeds the plan limit 100",
        lines: [
          pagesLine,
          renderInstance,
          {
            provider: "Render",
            label: "Outbound bandwidth",
            short: "Outbound",
            units: "55",
            unit: "GB",
            amount: "8.25",
            allowance: "5 GB included",
          },
          { provider: "Neon", label: "Free plan", short: "Neon Free", units: "1", unit: "month", amount: "0" },
          {
            provider: "Cloudflare",
            label: "R2 standard storage",
            short: "R2 storage",
            units: "90",
            unit: "GB-month",
            amount: "1.350",
            allowance: "10 GB-month free",
          },
          classOps,
        ],
      },
      {
        id: "ten_x_storage_egress",
        label: SCENARIO_LABELS.ten_x_storage_egress,
        total: "24.100",
        rejection: "neon-free · quota_exceeded — DbGb 5.0 exceeds the plan limit 1",
        lines: [
          pagesLine,
          renderInstance,
          {
            provider: "Render",
            label: "Outbound bandwidth",
            short: "Outbound",
            units: "15",
            unit: "GB",
            amount: "2.25",
            allowance: "5 GB included",
          },
          { provider: "Neon", label: "Free plan", short: "Neon Free", units: "1", unit: "month", amount: "0" },
          {
            provider: "Cloudflare",
            label: "R2 standard storage",
            short: "R2 storage",
            units: "990",
            unit: "GB-month",
            amount: "14.850",
            allowance: "10 GB-month free",
          },
          classOps,
        ],
      },
    ],
  },
  {
    id: "recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-launch+cloudflare-r2-standard",
    name: "Pages · Render Starter · Neon Launch · R2",
    role: "Performance-oriented",
    scenarios: [
      {
        id: "now",
        label: SCENARIO_LABELS.now,
        total: "17.135",
        lines: [
          pagesLine,
          renderInstance,
          {
            provider: "Render",
            label: "Outbound bandwidth",
            short: "Outbound",
            units: "15",
            unit: "GB",
            amount: "2.25",
            allowance: "5 GB included",
          },
          { provider: "Neon", label: "Compute", short: "Neon compute", units: "60", unit: "CU-hour", amount: "6.360" },
          {
            provider: "Neon",
            label: "Database storage",
            short: "Neon storage",
            units: "0.5",
            unit: "GB-month",
            amount: "0.175",
          },
          {
            provider: "Cloudflare",
            label: "R2 standard storage",
            short: "R2 storage",
            units: "90",
            unit: "GB-month",
            amount: "1.350",
            allowance: "10 GB-month free",
          },
          classOps,
        ],
      },
      {
        id: "three_x_traffic",
        label: SCENARIO_LABELS.three_x_traffic,
        total: "35.855",
        lines: [
          pagesLine,
          renderInstance,
          {
            provider: "Render",
            label: "Outbound bandwidth",
            short: "Outbound",
            units: "55",
            unit: "GB",
            amount: "8.25",
            allowance: "5 GB included",
          },
          {
            provider: "Neon",
            label: "Compute",
            short: "Neon compute",
            units: "180",
            unit: "CU-hour",
            amount: "19.080",
          },
          {
            provider: "Neon",
            label: "Database storage",
            short: "Neon storage",
            units: "0.5",
            unit: "GB-month",
            amount: "0.175",
          },
          {
            provider: "Cloudflare",
            label: "R2 standard storage",
            short: "R2 storage",
            units: "90",
            unit: "GB-month",
            amount: "1.350",
            allowance: "10 GB-month free",
          },
          classOps,
        ],
      },
      {
        id: "ten_x_storage_egress",
        label: SCENARIO_LABELS.ten_x_storage_egress,
        total: "32.210",
        lines: [
          pagesLine,
          renderInstance,
          {
            provider: "Render",
            label: "Outbound bandwidth",
            short: "Outbound",
            units: "15",
            unit: "GB",
            amount: "2.25",
            allowance: "5 GB included",
          },
          { provider: "Neon", label: "Compute", short: "Neon compute", units: "60", unit: "CU-hour", amount: "6.360" },
          {
            provider: "Neon",
            label: "Database storage",
            short: "Neon storage",
            units: "5.0",
            unit: "GB-month",
            amount: "1.750",
          },
          {
            provider: "Cloudflare",
            label: "R2 standard storage",
            short: "R2 storage",
            units: "990",
            unit: "GB-month",
            amount: "14.850",
            allowance: "10 GB-month free",
          },
          classOps,
        ],
      },
    ],
  },
];

export const RECEIPT_WORKLOAD = "node-sporadic.json";
export const RECEIPT_STACK = COMPARED_STACKS[0];
export const RECEIPT_SCENARIO = COMPARED_STACKS[0].scenarios[0];

export const HEADLINE_CLIFF = {
  scenario: SCENARIO_LABELS.three_x_traffic,
  card: "neon-free",
  used: "180",
  limit: "100",
  unit: "CU-h",
} as const;

export function padDecimal(amount: string, places = 3): string {
  const [whole, frac = ""] = amount.split(".");
  return `${whole}.${frac.padEnd(places, "0")}`;
}

export type EnvTrace = {
  role: string;
  key: string;
  path: string;
  line: number;
  secret: boolean;
};

export const ENV_TRACES: EnvTrace[] = [
  { role: "database_url", key: "PG_URL", path: "src/db.js", line: 2, secret: true },
  { role: "storage_endpoint", key: "R2_S3_ENDPOINT", path: "src/storage.js", line: 2, secret: false },
  { role: "storage_region", key: "R2_S3_REGION", path: "src/storage.js", line: 3, secret: false },
  { role: "storage_bucket", key: "UPLOADS_BUCKET", path: "src/storage.js", line: 4, secret: false },
  { role: "storage_access_key_id", key: "R2_KEY_ID", path: "src/storage.js", line: 5, secret: true },
  { role: "storage_secret_access_key", key: "R2_SECRET_KEY", path: "src/storage.js", line: 6, secret: true },
  { role: "cors_origin", key: "FRONTEND_ORIGIN", path: "src/server.js", line: 1, secret: false },
];

export type BundleFile = {
  name: string;
  description: string;
  preview: string;
};

export const BUNDLE_FILES: BundleFile[] = [
  {
    name: ".env.example",
    description: "Placeholders only, keyed to your code",
    preview: `# StackServe setup bundle (recipe-a) — status: prepared
# Placeholders only. Never commit real secrets.

# Server-side only. Use the pooled connection string.
PG_URL=replace_with_neon_pooled_connection_string

# Bucket name. R2 buckets start private.
UPLOADS_BUCKET=replace_with_bucket_name

# Exact browser origin of the Pages site.
FRONTEND_ORIGIN=replace_with_frontend_origin`,
  },
  {
    name: "DEPLOYMENT.md",
    description: "17 ordered steps, provision → teardown",
    preview: `# Deployment Runbook

- Artifact status: \`prepared\` (configuration templates
  generated; credentials, provisioning, and smoke tests
  are not yet executed)

1. provision  Create the Cloudflare Pages project
2. provision  Create the Render web service in Ohio
3. provision  Create the Neon project in aws-us-east-2
4. provision  Create a private R2 bucket
5. configure  Scope the R2 credential and Neon role
…
17. teardown  Tear down every resource`,
  },
  {
    name: "architecture-decision.md",
    description: "Why this stack, and what was rejected",
    preview: `# Architecture Decision Record

## Stack Selection & Evaluated Alternatives

- Selected [LowestCost, Balanced]: …neon-free…
  lowest known monthly total among feasible stacks
- Selected [Performance]: …neon-launch…
  cheapest feasible stack with no component that
  always sleeps when idle
- Rejected: recipe-b/… (UnsupportedRuntime)`,
  },
  {
    name: "provisioning-prompt.md",
    description: "Guardrails for an agent you authorise",
    preview: `# Provisioning Prompt

## Scope & Safety Guardrails

- Artifact status: \`prepared\`. No resource has been
  created or verified yet.
- Confirm account, project/workspace, and spending
  limits with the user before creating, modifying, or
  deleting any cloud resource.
- Never read \`.env\` or echo real credentials.`,
  },
  {
    name: "resource-manifest.json",
    description: "Machine-readable resources and traces",
    preview: `{
  "catalog_version": "${CATALOG_VERSION}",
  "corpus_version": "${CORPUS_VERSION}",
  "environment_variables": [
    {
      "key": "PG_URL",
      "role": "database_url",
      "trace": {
        "kind": "code_reference",
        "path": "src/db.js",
        "line": 2
      }
    },`,
  },
];
