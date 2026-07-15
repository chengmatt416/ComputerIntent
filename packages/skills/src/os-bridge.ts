import { exec } from "node:child_process";
import { promisify } from "node:util";
import { validateActionApproval, type ActionApproval } from "@lhic/security";
import {
  createSkillTrace,
  skillFailure,
  type SkillContext,
  type SkillResult,
} from "./skill-types.js";

const execAsync = promisify(exec);

async function performOsClick(x: number, y: number): Promise<string> {
  const platform = process.platform;
  if (platform === "darwin") {
    await execAsync(`osascript -e 'tell application "System Events" to click at {${x}, ${y}}'`);
    return `Simulated OS click at (${x}, ${y}) using AppleScript.`;
  }
  if (platform === "win32") {
    const command = `powershell -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing'); [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);' -Name Mouse -Namespace Win; [Win.Mouse]::mouse_event(0x0002, 0, 0, 0, 0); [Win.Mouse]::mouse_event(0x0004, 0, 0, 0, 0);"`;
    await execAsync(command);
    return `Simulated OS click at (${x}, ${y}) using Windows Forms API.`;
  }
  try {
    await execAsync(`xdotool mousemove ${x} ${y} click 1`);
    return `Simulated OS click at (${x}, ${y}) using xdotool.`;
  } catch (error) {
    throw new Error(`Linux OS click requires xdotool. Please install it with "sudo apt-get install xdotool". Error: ${(error as Error).message}`);
  }
}

async function performOsType(text: string): Promise<string> {
  const platform = process.platform;
  if (platform === "darwin") {
    const escapedText = text.replace(/"/g, '\\"');
    await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escapedText}"'`);
    return "Simulated OS keystroke using AppleScript.";
  }
  if (platform === "win32") {
    // Escape SendKeys special characters: + ^ % ~ ( ) [ ] { }
    const escapedText = text.replace(/'/g, "''").replace(/([+^%~{}()[\]])/g, "{$1}");
    const command = `powershell -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`;
    await execAsync(command);
    return "Simulated OS keystroke using Windows SendKeys API.";
  }
  try {
    const escapedText = text.replace(/'/g, "'\\''");
    await execAsync(`xdotool type --delay 10 '${escapedText}'`);
    return "Simulated OS keystroke using xdotool.";
  } catch (error) {
    throw new Error(`Linux OS typing requires xdotool. Please install it with "sudo apt-get install xdotool". Error: ${(error as Error).message}`);
  }
}

export async function executeOsAction(
  context: SkillContext,
  action: { type: "os_click" | "os_type"; x?: number; y?: number; text?: string },
  approval?: ActionApproval,
): Promise<SkillResult> {
  const trace = createSkillTrace(context);
  await trace.emit("os_action_started", { type: action.type });

  const semanticAction = {
    type: "custom" as const,
    intent: `Execute OS action: ${action.type}`,
    target: action.type,
    value: action.type === "os_click" ? `${action.x},${action.y}` : action.text,
    methodPreference: ["keyboard" as const],
    riskLevel: "high" as const,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvalOptions: any = {
    requireSignature: process.env.LHIC_ENV === "production",
  };
  if (process.env.LHIC_APPROVAL_PUBLIC_KEY) {
    approvalOptions.publicKey = process.env.LHIC_APPROVAL_PUBLIC_KEY;
  }

  const approvalDecision = validateActionApproval(
    semanticAction,
    approval,
    new Date(),
    approvalOptions,
  );

  if (!approvalDecision.allowed) {
    await trace.emit("os_action_approval_rejected", { reason: approvalDecision.reason });
    return skillFailure(trace, `OS action requires signed approval: ${approvalDecision.reason}`);
  }

  try {
    if (action.type === "os_click") {
      if (typeof action.x !== "number" || typeof action.y !== "number") {
        throw new Error("OS click requires x and y coordinates.");
      }
      const evidenceText = await performOsClick(action.x, action.y);
      await trace.emit("os_click_completed", { x: action.x, y: action.y });
      return {
        success: true,
        evidence: [evidenceText],
        traces: trace.events,
      };
    } else if (action.type === "os_type") {
      if (typeof action.text !== "string") {
        throw new Error("OS type requires text content.");
      }
      const evidenceText = await performOsType(action.text);
      await trace.emit("os_type_completed", { text: "[REDACTED]" });
      return {
        success: true,
        evidence: [evidenceText],
        traces: trace.events,
      };
    } else {
      throw new Error(`Unsupported OS action type: ${action.type}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "OS action failed.";
    await trace.emit("os_action_failed", { error: message });
    return skillFailure(trace, message);
  }
}
