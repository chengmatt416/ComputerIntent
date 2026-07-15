import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import type {
  ActionExecutionResult,
  NormalizedUIState,
  SemanticAction,
} from "@lhic/schema";
import type { ActionApproval } from "@lhic/security";

import {
  callComputerUseTool,
  createComputerUseServer,
  type ComputerUseActionResult,
  type ComputerUseSession,
  type ComputerUseSnapshot,
  type ComputerUseStartResult,
} from "./index.js";

class FakeComputerUseSession implements ComputerUseSession {
  public readonly state: NormalizedUIState = {
    surface: "browser",
    url: "https://example.test/settings",
    title: "Example settings",
    objects: [
      {
        id: "email",
        role: "textbox",
        label: "Email",
        value: "person@example.com",
        enabled: true,
        focused: false,
        source: "dom",
        selector: "#email",
      },
    ],
    signals: {},
    capturedAt: "2026-07-15T00:00:00.000Z",
  };

  public action: SemanticAction | undefined;
  public approval: ActionApproval | undefined;
  public closed = false;

  public async start(url?: string): Promise<ComputerUseStartResult> {
    return {
      state: { ...this.state, ...(url ? { url } : {}) },
      ...(url
        ? {
            navigation: this.successResult("api"),
          }
        : {}),
    };
  }

  public async observe(): Promise<ComputerUseSnapshot> {
    return { state: this.state };
  }

  public async act(
    action: SemanticAction,
    approval?: ActionApproval,
  ): Promise<ComputerUseActionResult> {
    this.action = action;
    this.approval = approval;
    return { result: this.successResult("dom"), state: this.state };
  }

  public async close(): Promise<void> {
    this.closed = true;
  }

  private successResult(method: "api" | "dom"): ActionExecutionResult {
    return {
      success: true,
      method,
      latencyMs: 1,
      evidence: ["Fixture action completed."],
    };
  }
}

describe("LHIC computer-use MCP server", () => {
  it("advertises the Antigravity browser computer-use tools through MCP", async () => {
    const session = new FakeComputerUseSession();
    const server = createComputerUseServer(session);
    const client = new Client(
      { name: "lhic-mcp-test-client", version: "0.1.0" },
      { capabilities: {} },
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client.listTools();
      expect(result.tools.map((tool) => tool.name)).toEqual([
        "lhic_browser_start",
        "lhic_browser_observe",
        "lhic_browser_act",
        "lhic_browser_close",
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("executes validated semantic actions and omits browser input values", async () => {
    const session = new FakeComputerUseSession();
    const response = await callComputerUseTool(session, "lhic_browser_act", {
      action: {
        type: "click",
        intent: "open profile settings",
        target: "#profile",
        methodPreference: ["dom", "accessibility"],
        riskLevel: "low",
      },
    });

    expect(session.action).toMatchObject({
      type: "click",
      target: "#profile",
      riskLevel: "low",
    });
    expect(response.isError).toBeUndefined();
    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    expect(text).toContain("Example settings");
    expect(text).not.toContain("person@example.com");
    expect(text).not.toContain('"value"');
  });

  it("rejects malformed actions without invoking the browser", async () => {
    const session = new FakeComputerUseSession();
    const response = await callComputerUseTool(session, "lhic_browser_act", {
      action: { type: "click" },
    });

    expect(response.isError).toBe(true);
    expect(session.action).toBeUndefined();
  });

  it("rejects semantic actions that the direct browser executor cannot run", async () => {
    const session = new FakeComputerUseSession();
    const response = await callComputerUseTool(session, "lhic_browser_act", {
      action: {
        type: "download",
        intent: "download the export",
        methodPreference: ["api"],
        riskLevel: "low",
      },
    });

    expect(response.isError).toBe(true);
    expect(session.action).toBeUndefined();
  });
});
