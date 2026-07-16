# LHIC 0.1.2 release notes

## Release status

This is the release-note source for `@pinyencheng/lhic@0.1.2`. It is a
release candidate until the npm publication, registry smoke test, immutable
Git tag, and GitHub Release all succeed.

## Highlights

- Adds `lhic demo`, a credential-free local Judge Demo that emits verifier
  evidence and shows destructive intent stopping at the `ask_user` approval
  boundary.
- Includes the typed GPT-5.6 Slow Path provider: strict structured output,
  request redaction, `store: false`, bounded failure behavior, and semantic
  action validation. It remains disabled by default.
- Adds reproducible package checks: `npm run package:smoke` validates the
  local tarball, and `npm run package:published-smoke -- 0.1.2` validates the
  actual registry package from an isolated `npx` environment after publishing.
- Documents the safe Fast Path boundary, reproducibility procedure,
  benchmark scope, threat model, Judge Guide, and Devpost evidence gaps.

## Verified release-candidate evidence

- Commit: `bfcee98a5f7177a92ae6cdbd566b10fcf522dacf`.
- [GitHub Actions run 29515986573](https://github.com/chengmatt416/LHIC/actions/runs/29515986573): verify plus Ubuntu, macOS, and Windows package-smoke jobs passed.
- Local `npm run ci`, `npm run package:smoke`, and
  `npm publish --dry-run --workspace @pinyencheng/lhic --access public` passed.

## Required publication evidence

Before marking this release complete, publish exactly `0.1.2`, run:

```bash
npm run package:published-smoke -- 0.1.2
```

Then create an immutable `v0.1.2` Git tag and GitHub Release using these notes,
record the release URL and package integrity, and add those facts to the Devpost
submission. Do not claim that the previously published `0.1.1` supports
`lhic demo`; it does not.
