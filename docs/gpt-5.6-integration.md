# GPT-5.6 integration

## Runtime responsibility

GPT-5.6 is an optional **Slow Path** planner for ambiguous browser tasks. It
receives a redacted `SlowPathRequest` containing the user goal, normalized UI
state, recent redacted trace events, and the reason Fast Path could not safely
continue. It may return one of four decisions: `ask_user`, `propose_plan`,
`retry_with_action`, or `blocked`.

Fast Path does not call GPT-5.6, MCP, or any other remote service. Known,
low-risk browser skills continue through local Playwright execution only.

## Contract and validation

`OpenAISlowPathProvider` uses the OpenAI Responses API with `model: "gpt-5.6"`,
`store: false`, and `text.format` set to strict `json_schema`. The schema only
permits browser semantic actions; every action is subsequently validated by
LHIC's `isBrowserSemanticAction` guard before an executor can receive it.

The provider rejects HTTP failures, timeouts, model refusals, missing output,
invalid JSON, and schema-valid-looking values that fail LHIC's own action
validation. A rejected plan never becomes a skill and never bypasses policy or
human approval.

## Security boundary

- `redactPII` runs before the request is serialized.
- Passwords, tokens, cookies, API keys, sensitive values, and common PII
  patterns are removed from the model payload.
- Model credentials are read only from process environment variables; they are
  never included in traces, actions, command arguments, or generated files.
- High-risk actions remain subject to LHIC risk policy and matching human
  approval at the executor boundary.
- The default 30-second model timeout fails closed.

## Enablement

```bash
OPENAI_SLOW_PATH_ENABLED=true \
OPENAI_API_KEY=... \
LHIC_OPENAI_MODEL=gpt-5.6 \
npm run demo
```

`LHIC_OPENAI_API_KEY` is also accepted for deployments that isolate LHIC's
credential naming. The default model is `gpt-5.6`; do not change it in a demo
or submission without recording the exact model identifier used.

## Evidence

`packages/controller/src/openai-provider.test.ts` verifies the disabled-by-
default behavior, missing-key failure, `store: false`, strict schema use,
request redaction, semantic-action rejection, and model-refusal handling.

The implementation follows the OpenAI Responses API structured-output pattern:
[Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
