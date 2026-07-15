import { describe, expect, it } from "vitest";

import {
  parseMcpHarness,
  renderMcpHarnessConfig,
} from "./mcp-harness-config.js";

describe("MCP harness configuration", () => {
  const workspaceRoot = "/tmp/Computer Intent";
  const entrypoint = "/tmp/Computer Intent/apps/mcp-server/dist/index.js";

  it("recognises only supported harness identifiers", () => {
    expect(parseMcpHarness("codex")).toBe("codex");
    expect(parseMcpHarness("unknown")).toBeUndefined();
  });

  it("renders a Codex TOML snippet with an absolute entrypoint and prompts", () => {
    const config = renderMcpHarnessConfig("codex", workspaceRoot);

    expect(config).toContain(`args = ["${entrypoint}"]`);
    expect(config).toContain(`cwd = "${workspaceRoot}"`);
    expect(config).toContain('default_tools_approval_mode = "prompt"');
  });

  it.each(["antigravity", "claude-code", "vscode"] as const)(
    "renders valid %s JSON with a portable absolute entrypoint",
    (harness) => {
      const config = JSON.parse(renderMcpHarnessConfig(harness, workspaceRoot));
      const server =
        harness === "vscode"
          ? config.servers.lhicComputerUse
          : config.mcpServers["lhic-computer-use"];

      expect(server).toEqual({
        command: "node",
        args: [entrypoint],
        ...(harness === "antigravity" || harness === "vscode"
          ? { cwd: workspaceRoot }
          : {}),
      });
    },
  );
});
