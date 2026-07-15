import type { SemanticAction } from "@lhic/schema";

export interface BrowserGymAction {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
}

export function adaptBrowserGymAction(bgAction: BrowserGymAction): SemanticAction {
  switch (bgAction.name) {
    case "click":
      return {
        type: "click",
        intent: `Click target ${bgAction.args.bid || bgAction.args.selector}`,
        target: bgAction.args.bid || bgAction.args.selector,
        methodPreference: ["dom", "accessibility"],
        riskLevel: "low",
      };
    case "type":
    case "fill":
      return {
        type: "fill",
        intent: `Fill target ${bgAction.args.bid || bgAction.args.selector}`,
        value: bgAction.args.text || bgAction.args.value,
        target: bgAction.args.bid || bgAction.args.selector,
        methodPreference: ["dom", "accessibility"],
        riskLevel: "low",
      };
    case "press":
      return {
        type: "press",
        intent: `Press key ${bgAction.args.key} on target ${bgAction.args.bid || bgAction.args.selector}`,
        target: bgAction.args.bid || bgAction.args.selector,
        value: bgAction.args.key,
        methodPreference: ["keyboard"],
        riskLevel: "low",
      };
    case "goto":
      return {
        type: "navigate",
        intent: `Navigate to ${bgAction.args.url}`,
        target: bgAction.args.url,
        methodPreference: ["api"],
        riskLevel: "low",
      };
    case "wait":
      return {
        type: "wait",
        intent: `Wait for ${bgAction.args.timeout ?? 1000} ms`,
        value: bgAction.args.timeout ?? 1000,
        methodPreference: ["dom"],
        riskLevel: "low",
      };
    default:
      throw new Error(`Unsupported BrowserGym action: ${bgAction.name}`);
  }
}
