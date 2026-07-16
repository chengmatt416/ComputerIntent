# LHIC

LHIC is a local-first controller for deterministic browser and global desktop
actions. It runs browser Fast Path actions directly through Playwright and
controls macOS, Windows, and Linux desktops through native OS APIs.

Run `lhic` with no arguments to choose a command interactively. The CLI also
guides terminal users through required values omitted from `shared enable`,
`shared login`, `mcp config`, `run action`, benchmark readiness/evidence, and
trace inspection. Fully specified commands remain non-interactive for scripts
and CI.

The single-purpose shortcuts `lhic global`, `lhic bench simulate`, `lhic mcp`,
and `lhic trace` select their only subcommand automatically.

```bash
npx @pinyencheng/lhic global doctor
```

Global desktop actions are JSON files executed with:

```bash
npx @pinyencheng/lhic run action <action.json> <approval.json>
```

Every global action must include `scope: "os"`, a native method preference, a
post-action verifier, and a matching human `ActionApproval`. Typed values are
not stored in traces. Run `lhic global doctor` before use: macOS needs terminal
Accessibility permission, Windows needs PowerShell/Win32 access, and Linux is
supported on X11 with `xdotool` (Wayland is intentionally rejected).

See the project repository for full action examples, security configuration,
and browser automation documentation.
