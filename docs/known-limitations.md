# Known limitations

- The internal benchmark and resilience simulation use local fixtures; neither
  is evidence of real-world or leaderboard performance.
- The published-package `npx` smoke test and clean-room platform matrix have
  not yet been recorded in this repository.
- GPT-5.6 is optional Slow Path functionality. Without explicit enablement and
  an API key, LHIC does not make a model call; Fast Path remains fully local.
- A model plan is only a proposal. It still needs LHIC schema validation, risk
  policy, verifier evidence, and where required a matching human approval.
- Global desktop execution depends on OS permission, installed native tooling,
  and the active desktop session. It is not a browser Fast Path capability.
- CAPTCHA, 2FA, unclear intent, ambiguous targets, and missing verifier
  evidence fail closed and may require a human.
- The repository does not make claims about public submission status, video
  compliance, external benchmark ranking, or production readiness without the
  corresponding external evidence.
