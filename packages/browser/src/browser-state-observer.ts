import type { Page } from "playwright";

import type { NormalizedUIState, UIObject } from "@lhic/schema";

import { ConsoleNetworkObserver } from "./console-network-observer.js";

interface BrowserObjectSnapshot {
  id: string;
  role?: string | undefined;
  label?: string | undefined;
  value?: string | undefined;
  enabled: boolean;
  focused: boolean;
  selector: string;
}

export class BrowserStateObserver {
  public constructor(
    private readonly page: Page,
    private readonly networkObserver: ConsoleNetworkObserver = new ConsoleNetworkObserver(
      page,
    ),
  ) {}

  public async observe(): Promise<NormalizedUIState> {
    const [title, objects] = await Promise.all([
      this.safeTitle(),
      this.collectObjects(),
    ]);

    return {
      surface: "browser",
      url: this.page.url(),
      ...(title === undefined ? {} : { title }),
      objects: objects.map(
        (object) => ({ ...object, source: "dom" }) as UIObject,
      ),
      signals: { ...this.networkObserver.snapshot() },
      capturedAt: new Date().toISOString(),
    };
  }

  public dispose(): void {
    this.networkObserver.stop();
  }

  private async safeTitle(): Promise<string | undefined> {
    try {
      return await this.page.title();
    } catch {
      return undefined;
    }
  }

  private async collectObjects(): Promise<BrowserObjectSnapshot[]> {
    return this.page
      .locator("button, input, select, textarea, a[href], [role]")
      .evaluateAll((elements) => {
        return elements.map((element, index) => {
          const input = element as HTMLInputElement;
          const labelledBy = element.getAttribute("aria-labelledby");
          const labelledText = labelledBy
            ? labelledBy
                .split(/\s+/)
                .map((id) => document.getElementById(id)?.textContent?.trim())
                .filter(Boolean)
                .join(" ")
            : undefined;
          const nativeLabel = input.labels?.[0]?.textContent?.trim();
          const label =
            labelledText ||
            element.getAttribute("aria-label") ||
            nativeLabel ||
            element.getAttribute("placeholder") ||
            element.getAttribute("name") ||
            element.textContent?.trim() ||
            undefined;
          const testId = element.getAttribute("data-testid");
          const name = element.getAttribute("name");
          const tagName = element.tagName.toLowerCase();
          const indexWithinType = Array.from(
            element.parentElement?.children ?? [],
          )
            .filter((sibling) => sibling.tagName.toLowerCase() === tagName)
            .indexOf(element);
          const selector = element.id
            ? `#${CSS.escape(element.id)}`
            : testId
              ? `[data-testid="${CSS.escape(testId)}"]`
              : name
                ? `${tagName}[name="${CSS.escape(name)}"]`
                : `${tagName}:nth-of-type(${indexWithinType + 1})`;
          const implicitRole =
            element.tagName === "BUTTON"
              ? "button"
              : element.tagName === "A"
                ? "link"
                : element.tagName === "SELECT"
                  ? "combobox"
                  : element.tagName === "TEXTAREA" ||
                      input.type === "text" ||
                      input.type === "email" ||
                      input.type === "search"
                    ? "textbox"
                    : input.type === "checkbox"
                      ? "checkbox"
                      : undefined;
          const isPassword = input.type === "password";

          return {
            id: element.id || `ui-${index + 1}`,
            role: element.getAttribute("role") ?? implicitRole,
            label,
            value: "value" in input && !isPassword ? input.value : undefined,
            enabled: !(
              input.disabled || element.getAttribute("aria-disabled") === "true"
            ),
            focused: document.activeElement === element,
            selector,
          };
        });
      });
  }
}
