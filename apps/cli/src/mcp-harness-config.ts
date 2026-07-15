import { resolve } from "node:path";

export const mcpHarnesses = [
  "antigravity",
  "codex",
  "claude-code",
  "vscode",
] as const;

export type McpHarness = (typeof mcpHarnesses)[number];

export function parseMcpHarness(
  value: string | undefined,
): McpHarness | undefined {
  return mcpHarnesses.includes(value as McpHarness)
    ? (value as McpHarness)
    : undefined;
}

/**
 * Render a reviewable MCP server snippet without changing any harness files.
 * The emitted entrypoint is absolute so it remains valid when a client starts
 * the stdio server from an arbitrary working directory.
 */
export function renderMcpHarnessConfig(
  harness: McpHarness,
  workspaceRoot: string,
): string {
  const root = resolve(workspaceRoot);
  const entrypoint = resolve(root, "apps/mcp-server/dist/index.js");
  const server = {
    command: "node",
    args: [entrypoint],
    ...(harness === "antigravity" || harness === "vscode" ? { cwd: root } : {}),
  };

  if (harness === "codex") {
    return [
      "[mcp_servers.lhic_computer_use]",
      `command = ${tomlString(server.command)}`,
      `args = [${server.args.map(tomlString).join(", ")}]`,
      `cwd = ${tomlString(root)}`,
      "startup_timeout_sec = 20",
      "tool_timeout_sec = 45",
      'default_tools_approval_mode = "prompt"',
      "",
    ].join("\n");
  }

  if (harness === "vscode") {
    return `${JSON.stringify({ servers: { lhicComputerUse: server } }, null, 2)}\n`;
  }

  return `${JSON.stringify(
    { mcpServers: { "lhic-computer-use": server } },
    null,
    2,
  )}\n`;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}
