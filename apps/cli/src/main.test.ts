import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { isCliEntryPoint } from "./main.js";

describe("isCliEntryPoint", () => {
  it("recognizes the package-manager symlink used for a CLI binary", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lhic-cli-entry-"));
    const modulePath = join(directory, "main.js");
    const binaryPath = join(directory, "lhic");
    await writeFile(modulePath, "", "utf8");
    await symlink(modulePath, binaryPath);

    expect(isCliEntryPoint(binaryPath, modulePath)).toBe(true);
  });

  it("does not run for an unrelated or missing executable path", () => {
    expect(isCliEntryPoint(undefined, "/tmp/main.js")).toBe(false);
    expect(isCliEntryPoint("/tmp/lhic-missing", "/tmp/main.js")).toBe(false);
  });
});
