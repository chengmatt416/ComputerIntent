---
name: lhic-computer-use
description: Use LHIC's local browser computer-use MCP tools for deterministic, policy-controlled browser automation.
---

# LHIC browser computer use

Use the `lhic_browser_*` tools for browser work in this workspace.

1. Call `lhic_browser_start` once. Supply an absolute HTTP(S) URL only when a
   starting page is needed.
2. Call `lhic_browser_observe` before every action and use the returned
   structured DOM/accessibility state to choose a target.
3. Call `lhic_browser_act` with exactly one `SemanticAction`, then inspect its
   `result`, evidence, and the returned post-action state before continuing.
4. Call `lhic_browser_close` when the work is finished.

The action must include `type`, a specific `intent`, `methodPreference`, and
`riskLevel`. Prefer `dom`, `accessibility`, `keyboard`, and `api` in that order.
Do not use raw coordinates, screenshots, injected page JavaScript, or a
browser-native fallback for the same task.

For a high- or unknown-risk action, request human confirmation outside the
tool, then supply the matching `ActionApproval`. Never invent an approval. A
tool response is successful only when `result.success` is true and it includes
verifier evidence.
