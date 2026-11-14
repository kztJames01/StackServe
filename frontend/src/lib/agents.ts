export const BIN = "/absolute/path/to/stackserve/target/release/stackserve-mcp";

export type Snippet = {
  label: string;
  language: "bash" | "json";
  file?: string;
  code: string;
};

export type AgentEnv = {
  id: string;
  name: string;
  snippet: Snippet;
};

export const BUILD_SNIPPET: Snippet = {
  label: "Build once from a repository checkout",
  language: "bash",
  code: `git clone https://github.com/kztJames01/Stackfit stackserve && cd stackserve
(cd python/stackserve_rag && uv sync --locked)
cargo build -p stackserve-mcp --release`,
};

export const AGENT_ENVS: AgentEnv[] = [
  {
    id: "cursor",
    name: "Cursor",
    snippet: {
      label: "Project config",
      language: "json",
      file: ".cursor/mcp.json",
      code: `{
  "mcpServers": {
    "stackserve": {
      "command": "${BIN}",
      "args": ["serve"]
    }
  }
}`,
    },
  },
  {
    id: "opencode",
    name: "OpenCode",
    snippet: {
      label: "Add from the CLI",
      language: "bash",
      code: `opencode mcp add stackserve -- ${BIN} serve`,
    },
  },
  {
    id: "codex",
    name: "Codex",
    snippet: {
      label: "Register",
      language: "bash",
      code: `codex mcp add stackserve -- ${BIN} serve`,
    },
  },
  {
    id: "claude-code",
    name: "Claude Code",
    snippet: {
      label: "Register",
      language: "bash",
      code: `claude mcp add --transport stdio stackserve -- ${BIN} serve`,
    },
  },
  {
    id: "cli",
    name: "CLI",
    snippet: {
      label: "Recommend stacks for a fixture workload",
      language: "bash",
      code: "./target/release/stackserve-mcp recommend fixtures/workloads/node-sporadic.json",
    },
  },
];
