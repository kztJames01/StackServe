export const REMOTE_MCP_URL = "https://mcp.stackserve.net/mcp";

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
  label: "Install locally on $PATH (optional offline CLI)",
  language: "bash",
  code: `cargo install --git https://github.com/kztJames01/StackServe stackserve-mcp`,
};

export const AGENT_ENVS: AgentEnv[] = [
  {
    id: "cursor",
    name: "Cursor",
    snippet: {
      label: "Project or global config",
      language: "json",
      file: ".cursor/mcp.json",
      code: `{
  "mcpServers": {
    "stackserve": {
      "url": "${REMOTE_MCP_URL}"
    }
  }
}`,
    },
  },
  {
    id: "opencode",
    name: "OpenCode",
    snippet: {
      label: "Remote MCP config",
      language: "json",
      file: "opencode.json",
      code: `{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "stackserve": {
        "type": "remote",
        "url": "${REMOTE_MCP_URL}",
        "enabled": true
      }
    }
  }
}`,
    },
  },
  {
    id: "codex",
    name: "Codex",
    snippet: {
      label: "Install plugin or add remote MCP",
      language: "bash",
      code: `codex plugin marketplace add kztJames01/StackServe
codex plugin add stackserve@stackserve-marketplace`,
    },
  },
  {
    id: "claude-code",
    name: "Claude Code",
    snippet: {
      label: "Register remote HTTP server",
      language: "bash",
      code: `claude mcp add --scope user --transport http stackserve ${REMOTE_MCP_URL}`,
    },
  },
  {
    id: "cli",
    name: "CLI",
    snippet: {
      label: "Install once, then run offline",
      language: "bash",
      code: `cargo install --git https://github.com/kztJames01/StackServe stackserve-mcp
stackserve-mcp recommend workload.json`,
    },
  },
];
