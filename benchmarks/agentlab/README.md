# AgentLab runner

This digest-pinned Python 3.12/Debian bookworm image provides the complete AgentLab
experiment runtime needed for the supported BrowserGym studies: AgentLab 0.4.0,
BrowserGym 0.14.3, WorkArena 0.5.3, and image-owned Chromium. It has two
targets: a credential-free `preflight` target and a non-root `runner` target.
The runner accepts only complete named benchmarks; it intentionally has no
task-filter option. Preflight imports the pinned packages, constructs the
LHIC-backed `workarena_l1` study without running it, and launches Chromium.

```bash
docker build --target preflight --tag lhic-agentlab-preflight:local benchmarks/agentlab
docker run --rm lhic-agentlab-preflight:local

docker build \
  --target runner \
  --build-arg LHIC_SOURCE_REVISION=<committed-lhic-sha> \
  --tag lhic-agentlab-runner:local \
  benchmarks/agentlab
```

For a WorkArena L1 full run, record the immutable local image ID, use a
separately controlled environment file with approved gated access, mount an
empty results directory, and retain the exact command with the artifact:

```bash
export LHIC_IMAGE_DIGEST="$(docker image inspect --format '{{.Id}}' lhic-agentlab-runner:local)"

docker run --rm \
  --env-file /secure/path/workarena.env \
  -e LHIC_IMAGE_DIGEST \
  -v /absolute/path/to/results:/results \
  lhic-agentlab-runner:local \
  --benchmark workarena_l1 \
  --jobs 1 \
  --backend sequential \
  --strict-reproducibility
```

The runner writes `lhic-study-manifest.json` inside the AgentLab study
directory. It records the invocation, all resolved Python distribution
versions and their inventory SHA-256, supplied LHIC source revision, immutable
image ID, and SHA-256 values for every study artifact while deliberately never
reading or serialising secret values. The same source revision is an OCI image
label. Strict runs reject a missing source revision or image digest. Record the
resolved image ID and this manifest with every experiment:

```bash
docker image inspect lhic-agentlab-runner:local --format '{{.Id}}'
```

For WorkArena, obtain gated instance access separately and pass credentials
only through the approved runtime secret mechanism. Never bake them into the
image, shell history, comment, trace, manifest, or evidence artifact.

## Semantic-BID adapter

`lhic_agent.py` exposes `LhicSemanticAgentArgs` to AgentLab. It translates a
low-risk, explicit goal and BrowserGym `pruned_html` into BrowserGym BID
actions. It supports a two-step search (`fill` then `press`) plus explicit
multi-step plans separated by `then`; every turn re-binds its `fill`,
`select_option`, or safe navigation `click` against the current observation.
It also recognizes WorkArena's explicit knowledge-base navigation template
(`searching for … and open the article …`) as a search-and-open plan.
For WorkArena menu-navigation goals it can perform All menu → application
filter → visible target-module navigation, using only BID-bound controls.
For the benchmark's explicit create-form template it fills each named field in
turn, but never clicks Submit: mutations still require an explicit human
approval path outside this adapter.
If BrowserGym reports that an action failed, the adapter marks that goal
infeasible and stops. It also requires BrowserGym to echo the exact previous
action before it advances the plan; it never silently advances, assumes an
action was executed, or blindly retries.
Buttons whose names imply an external side effect (for example, submit, save,
delete, purchase, or send) and every unmatched/high-risk goal are reported as
infeasible rather than guessed.

Run the standard-library policy tests without AgentLab installed:

```bash
PYTHONPATH=benchmarks/agentlab python3 -m unittest discover -s benchmarks/agentlab/tests
```

This is an expanding debug adapter, not a complete benchmark agent. The
container can now run a complete named suite, but the adapter still needs broad
task planning, post-action verification, and state recovery before any result
is likely to be competitive. A successful container invocation is not a
performance claim or an external submission.
