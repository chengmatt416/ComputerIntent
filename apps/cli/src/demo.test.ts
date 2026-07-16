import { describe, expect, it } from "vitest";

import { runJudgeDemo } from "./demo.js";

describe("Judge demo", () => {
  it("runs a safe local fixture and demonstrates the approval boundary", async () => {
    const previousEnabled = process.env.OPENAI_SLOW_PATH_ENABLED;
    process.env.OPENAI_SLOW_PATH_ENABLED = "false";
    try {
      await expect(runJudgeDemo()).resolves.toMatchObject({
        passed: true,
        localExecution: { passed: true },
        approvalGate: { passed: true, path: "ask_user" },
        gpt56: { enabled: false, decision: "blocked" },
      });
    } finally {
      if (previousEnabled === undefined) {
        delete process.env.OPENAI_SLOW_PATH_ENABLED;
      } else {
        process.env.OPENAI_SLOW_PATH_ENABLED = previousEnabled;
      }
    }
  });
});
