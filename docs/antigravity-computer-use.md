# Antigravity computer use

This workspace exposes LHIC as Antigravity's browser computer-use provider. It
is an external-agent MCP integration, not an LHIC Slow Path provider: agy plans
and calls the tools, while LHIC executes the browser action locally through its
existing policy-controlled Playwright executor.

```text
agy → LHIC MCP tools → semantic browser action → Playwright → verifier evidence + redacted trace
```

The integration is intentionally browser-only. It does not automate arbitrary
macOS desktop applications, and it does not use a screenshot-to-model or
raw-coordinate loop.

## Start it

From the repository root:

```bash
npm install
npm run build
agy plugin validate .agents/plugins/lhic-computer-use
agy
```

The workspace plugin at `.agents/plugins/lhic-computer-use` is discovered by
Antigravity. Its MCP configuration starts
`apps/mcp-server/dist/index.js`; therefore build the workspace before starting
agy. Use Antigravity's `/mcp` view to confirm that `lhic-computer-use` has
connected and that the four `lhic_browser_*` tools are available.

The browser is visible by default so that the local operator can see computer
use. Set `LHIC_MCP_HEADLESS=true` only for unattended development or CI.

## Tool contract

| Tool                   | Purpose                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `lhic_browser_start`   | Launch one LHIC-owned browser session and optionally navigate.                       |
| `lhic_browser_observe` | Return normalized DOM/accessibility state without form input values.                 |
| `lhic_browser_act`     | Execute one validated `SemanticAction`, then return result, evidence, and new state. |
| `lhic_browser_close`   | Close the LHIC-owned browser session.                                                |

`lhic_browser_act` uses the same navigation policy, action timeouts, approval
validation, redacted trace events, and verifier evidence as the direct LHIC
executor. High- and unknown-risk actions require a matching human
`ActionApproval`; in production, the existing signed-approval configuration
still applies.

Antigravity supports local stdio MCP servers and workspace plugins; this
integration uses those supported extension points. See the
[Antigravity MCP documentation](https://antigravity.google/docs/mcp?authuser=50)
and [plugin documentation](https://antigravity.google/docs/ide-plugins).
