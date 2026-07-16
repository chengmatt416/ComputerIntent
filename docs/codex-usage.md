# Codex collaboration

The project maintainer conceived LHIC, set product direction, defined the
architecture and threat model, reviewed implementation choices, and accepted
the final engineering and release decisions. Codex accelerated implementation,
test creation, debugging, refactoring, benchmark tooling, and documentation.

## Evidence in this repository

- The Build Week commit mapping is in [build-week-changelog.md](build-week-changelog.md).
- Controller, browser, verifier, security, memory, and CLI tests demonstrate
  iterative implementation rather than a documentation-only contribution.
- The safe demo and GPT-5.6 provider tests make the current release candidate
  reproducible without exposing credentials.

## Submission requirement

Before submitting, add the official `/feedback` Session ID for the primary
Codex development thread to the Devpost entry and the release evidence. Do not
substitute a guessed thread ID or a documentation-only session. Keep the
decision record: important accepted, modified, and rejected suggestions should
be traceable to commits, tests, or review notes.
