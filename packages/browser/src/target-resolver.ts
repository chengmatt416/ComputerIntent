import type { ActionMethod } from "@lhic/schema";
import type { Locator, Page } from "playwright";

export interface ResolvedTarget {
  locator: Locator;
  method: Extract<ActionMethod, "dom" | "accessibility">;
  description: string;
  safetyText: string;
}

async function matchCount(locator: Locator): Promise<number> {
  try {
    return await locator.count();
  } catch {
    return 0;
  }
}

export async function resolveTarget(
  page: Page,
  target: string,
  selectorMemory?: { find: (skillName: string, target: string) => Array<{ selector: string }> },
  skillName?: string,
): Promise<ResolvedTarget> {
  const selector = page.locator(target);
  const selectorCount = await matchCount(selector);
  if (selectorCount === 1) {
    return resolvedTarget(selector, "dom", `selector ${target}`);
  }
  if (selectorCount > 1) {
    throw new Error(
      `DOM selector ${JSON.stringify(target)} matched ${selectorCount} elements; use a unique target.`,
    );
  }

  const accessibleCandidates: Array<[string, Locator]> = [
    ["label", page.getByLabel(target, { exact: true })],
    ["button", page.getByRole("button", { name: target, exact: true })],
    ["link", page.getByRole("link", { name: target, exact: true })],
    ["textbox", page.getByRole("textbox", { name: target, exact: true })],
    ["combobox", page.getByRole("combobox", { name: target, exact: true })],
    ["text", page.getByText(target, { exact: true })],
  ];

  for (const [kind, locator] of accessibleCandidates) {
    const count = await matchCount(locator);
    if (count === 1) {
      return resolvedTarget(
        locator,
        "accessibility",
        `${kind} named ${target}`,
      );
    }
    if (count > 1) {
      throw new Error(
        `Accessibility ${kind} target ${JSON.stringify(target)} matched ${count} elements; use a unique target.`,
      );
    }
  }

  if (selectorMemory && skillName) {
    const historical = selectorMemory.find(skillName, target);
    for (const entry of historical) {
      const healedSelector = page.locator(entry.selector);
      if (await matchCount(healedSelector) === 1) {
        return resolvedTarget(healedSelector, "dom", `healed selector ${entry.selector}`);
      }
    }
  }

  throw new Error(
    `No DOM or accessibility target matched ${JSON.stringify(target)}.`,
  );
}

async function resolvedTarget(
  locator: Locator,
  method: Extract<ActionMethod, "dom" | "accessibility">,
  description: string,
): Promise<ResolvedTarget> {
  return {
    locator,
    method,
    description,
    safetyText: await locator.evaluate((element) => {
      const input = element as HTMLInputElement;
      const labelledBy = element.getAttribute("aria-labelledby");
      const labelledText = labelledBy
        ? labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim())
            .filter(Boolean)
            .join(" ")
        : "";
      return [
        element.getAttribute("aria-label"),
        labelledText,
        input.labels?.[0]?.textContent?.trim(),
        element.getAttribute("title"),
        element.getAttribute("name"),
        element.id,
        element.textContent?.trim(),
      ]
        .filter(Boolean)
        .join(" ");
    }),
  };
}
