import { createInterface } from "node:readline/promises";

export interface CliPrompter {
  readonly interactive: boolean;
  prompt(message: string, defaultValue?: string): Promise<string>;
  close(): void;
}

export const cliUsage =
  "Usage: lhic [start [memory-database] | shared <enable|login|disable|status|sync|list> [options] | preflight | global doctor | run action <action-file> [approval-file] | bench internal | bench simulate resilience [task-count] [seed] | bench readiness <workarena|webarena> | bench validate-evidence <file> | mcp config <antigravity|codex|claude-code|vscode> [workspace-root] | trace inspect <trace-file>]";

export function createTerminalPrompter(): CliPrompter {
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const readline = interactive
    ? createInterface({ input: process.stdin, output: process.stdout })
    : undefined;

  return {
    interactive,
    async prompt(message: string, defaultValue?: string): Promise<string> {
      if (!readline) {
        throw new Error(
          "Interactive guidance requires a terminal. Supply the required arguments explicitly.",
        );
      }
      const suffix = defaultValue ? ` [${defaultValue}]` : "";
      const answer = await readline.question(`${message}${suffix}: `);
      return answer.trim() || defaultValue || "";
    },
    close(): void {
      readline?.close();
    },
  };
}

export async function guideCliArguments(
  argumentsList: string[],
  prompter: CliPrompter,
): Promise<string[]> {
  let guided = [...argumentsList];
  if (guided.length === 0) {
    guided = await chooseRootCommand(prompter);
  }

  switch (guided[0]) {
    case "shared":
      return guideSharedCommand(guided, prompter);
    case "global":
      return guideGlobalCommand(guided);
    case "run":
      return guideRunCommand(guided, prompter);
    case "bench":
      return guideBenchmarkCommand(guided, prompter);
    case "mcp":
      return guideMcpCommand(guided, prompter);
    case "trace":
      return guideTraceCommand(guided, prompter);
    default:
      return guided;
  }
}

async function chooseRootCommand(prompter: CliPrompter): Promise<string[]> {
  const choice = await askChoice(prompter, "What would you like LHIC to do", [
    "start",
    "preflight",
    "global doctor",
    "run action",
    "shared",
    "bench",
    "mcp",
    "trace",
  ]);
  return choice.split(" ");
}

async function guideSharedCommand(
  argumentsList: string[],
  prompter: CliPrompter,
): Promise<string[]> {
  const guided = [...argumentsList];
  const command =
    guided[1] ??
    (await askChoice(prompter, "Shared skills action", [
      "enable",
      "login",
      "disable",
      "status",
      "sync",
      "list",
    ]));
  guided[1] = command;

  if (command === "enable") {
    await promptForSharedOption(
      guided,
      "--endpoint",
      "Appwrite endpoint (for example, https://<region>.cloud.appwrite.io/v1)",
      prompter,
    );
    await promptForSharedOption(
      guided,
      "--project",
      "Appwrite project ID",
      prompter,
    );
    await promptForSharedOption(
      guided,
      "--function-url",
      "Appwrite Function URL",
      prompter,
    );
    await promptForSharedOption(
      guided,
      "--email",
      "Email address for Magic URL sign-in",
      prompter,
    );
  }

  if (command === "login") {
    await promptForSharedOption(
      guided,
      "--email",
      "Email address for Magic URL sign-in",
      prompter,
    );
  }

  return guided;
}

async function guideGlobalCommand(argumentsList: string[]): Promise<string[]> {
  const guided = [...argumentsList];
  guided[1] ??= "doctor";
  return guided;
}

async function guideRunCommand(
  argumentsList: string[],
  prompter: CliPrompter,
): Promise<string[]> {
  const guided = [...argumentsList];
  guided[1] ??= "action";
  if (guided[1] === "action" && !guided[2]) {
    guided[2] = await askRequired(prompter, "Path to action JSON file");
  }
  return guided;
}

async function guideBenchmarkCommand(
  argumentsList: string[],
  prompter: CliPrompter,
): Promise<string[]> {
  const guided = [...argumentsList];
  const command =
    guided[1] ??
    (await askChoice(prompter, "Benchmark action", [
      "internal",
      "simulate resilience",
      "readiness",
      "validate-evidence",
    ]));
  const commandParts = command.split(" ");
  guided[1] = commandParts[0]!;
  if (commandParts[1]) {
    guided[2] ??= commandParts[1];
  }

  if (guided[1] === "simulate") {
    guided[2] ??= "resilience";
  }
  if (guided[1] === "readiness" && !guided[2]) {
    guided[2] = await askChoice(prompter, "Benchmark target", [
      "workarena",
      "webarena",
    ]);
  }
  if (guided[1] === "validate-evidence" && !guided[2]) {
    guided[2] = await askRequired(prompter, "Path to benchmark evidence file");
  }
  return guided;
}

async function guideMcpCommand(
  argumentsList: string[],
  prompter: CliPrompter,
): Promise<string[]> {
  const guided = [...argumentsList];
  guided[1] ??= "config";
  if (guided[1] === "config" && !guided[2]) {
    guided[2] = await askChoice(prompter, "MCP client", [
      "antigravity",
      "codex",
      "claude-code",
      "vscode",
    ]);
  }
  return guided;
}

async function guideTraceCommand(
  argumentsList: string[],
  prompter: CliPrompter,
): Promise<string[]> {
  const guided = [...argumentsList];
  guided[1] ??= "inspect";
  if (guided[1] === "inspect" && !guided[2]) {
    guided[2] = await askRequired(prompter, "Path to trace file");
  }
  return guided;
}

async function promptForSharedOption(
  argumentsList: string[],
  option: string,
  message: string,
  prompter: CliPrompter,
): Promise<void> {
  const index = argumentsList.indexOf(option);
  if (index >= 0 && optionValue(argumentsList, index)) {
    return;
  }
  const value = await askRequired(prompter, message);
  if (index >= 0) {
    argumentsList.splice(index + 1, 0, value);
  } else {
    argumentsList.push(option, value);
  }
}

function optionValue(
  argumentsList: string[],
  index: number,
): string | undefined {
  const value = argumentsList[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

async function askChoice(
  prompter: CliPrompter,
  message: string,
  choices: readonly string[],
): Promise<string> {
  const question = `${message} (${choices.join(", ")})`;
  while (true) {
    const choice = await askRequired(prompter, question);
    if (choices.includes(choice)) {
      return choice;
    }
  }
}

async function askRequired(
  prompter: CliPrompter,
  message: string,
): Promise<string> {
  if (!prompter.interactive) {
    throw new Error(`Missing required input for ${message}. ${cliUsage}`);
  }
  while (true) {
    const value = await prompter.prompt(message);
    if (value.trim()) {
      return value.trim();
    }
  }
}
