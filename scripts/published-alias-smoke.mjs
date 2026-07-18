import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageVersion = process.argv[2];

if (!packageVersion) {
  throw new Error(
    "Usage: npm run package:published-alias-smoke -- <published-package-version>",
  );
}

const corePackageSpec = `@pinyencheng/lhic@${packageVersion}`;
const aliasPackageSpec = `lhic@${packageVersion}`;
const workDirectory = await mkdtemp(join(tmpdir(), "lhic-alias-smoke-"));
const npmCacheDirectory = await mkdtemp(
  join(tmpdir(), "lhic-alias-npm-cache-"),
);
const browserDirectory = await mkdtemp(
  join(tmpdir(), "lhic-alias-browser-cache-"),
);
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

try {
  await runNpx([
    "--yes",
    `--package=${corePackageSpec}`,
    "playwright",
    "install",
    "chromium",
  ]);
  const { stdout } = await runNpx([
    "--yes",
    aliasPackageSpec,
    "demo",
    "--safe",
  ]);
  const report = JSON.parse(stdout);
  if (!report.passed || report.gpt56?.enabled) {
    throw new Error("The published lhic compatibility command did not pass.");
  }
  console.log(
    JSON.stringify(
      {
        package: aliasPackageSpec,
        passed: report.passed,
        localExecution: report.localExecution,
        approvalGate: report.approvalGate,
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.all([
    rm(workDirectory, { recursive: true, force: true }),
    rm(npmCacheDirectory, { recursive: true, force: true }),
    rm(browserDirectory, { recursive: true, force: true }),
  ]);
}

function runNpx(argumentsList) {
  return execFileAsync(npxCommand, ["--loglevel=error", ...argumentsList], {
    cwd: workDirectory,
    env: demoEnvironment(),
    maxBuffer: 10 * 1024 * 1024,
    shell: process.platform === "win32",
  });
}

function demoEnvironment() {
  const environment = {
    ...process.env,
    OPENAI_SLOW_PATH_ENABLED: "false",
    npm_config_cache: npmCacheDirectory,
    PLAYWRIGHT_BROWSERS_PATH: browserDirectory,
  };
  delete environment.OPENAI_API_KEY;
  delete environment.LHIC_OPENAI_API_KEY;
  return environment;
}
