import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright";
import { afterEach, describe, expect, it } from "vitest";

import { VerifierEngine } from "@lhic/verifier";

import { fillForm } from "./fill-form.js";

describe("fillForm", () => {
  const browsers: Awaited<ReturnType<typeof chromium.launch>>[] = [];

  afterEach(async () => {
    await Promise.all(browsers.splice(0).map((browser) => browser.close()));
  });

  it("fills verified fields but requires a separate approved action to submit", async () => {
    const browser = await chromium.launch({ headless: true });
    browsers.push(browser);
    const page = await browser.newPage();
    await page.setContent(`
      <form><label>Email <input name="email"></label><label>Name <input name="name"></label><button type="submit">Submit</button></form>
      <p id="result"></p>
      <script>document.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); document.querySelector('#result').textContent = 'Submitted'; });</script>
    `);
    const directory = await mkdtemp(join(tmpdir(), "lhic-skills-"));
    try {
      const result = await fillForm(
        {
          page,
          verifier: new VerifierEngine({ page }),
          taskId: "fill-form",
          traceFilePath: join(directory, "events.jsonl"),
        },
        { fields: { email: "person@example.com", name: "Ada" }, submit: true },
      );

      expect(result).toMatchObject({
        success: false,
        askUser: true,
        error: expect.stringContaining("separately approved SemanticAction"),
      });
      expect(await page.locator('[name="email"]').inputValue()).toBe(
        "person@example.com",
      );
      expect(await page.locator("#result").textContent()).toBe("");
      expect(result.traces.map((event) => event.type)).toContain(
        "fill_form_requires_human_approval",
      );
      expect(JSON.stringify(result.traces)).not.toContain("person@example.com");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not match an unrelated control when form metadata is absent", async () => {
    const browser = await chromium.launch({ headless: true });
    browsers.push(browser);
    const page = await browser.newPage();
    await page.setContent(
      '<form><input><button type="submit">Submit</button></form>',
    );
    const directory = await mkdtemp(join(tmpdir(), "lhic-skills-"));
    try {
      const result = await fillForm(
        {
          page,
          verifier: new VerifierEngine({ page }),
          taskId: "fill-form-unmatched",
          traceFilePath: join(directory, "events.jsonl"),
        },
        { fields: { name: "Ada" } },
      );

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("No form control matched"),
      });
      expect(await page.locator("input").inputValue()).toBe("");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
